import pool, { databaseFailure } from './db.js';
import { requireSession } from './auth.js';
import { subscriptionInfo } from './subscription.js';
import { rateLimit } from './rate-limit.js';

export default async function activate(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
  if (!rateLimit(req, res, { key: 'activate', limit: 10, windowMs: 60_000 })) return;
  const session = requireSession(req, res);
  if (!session) return;

  const key = String(req.body?.key || '').trim().toUpperCase();
  if (!key) return res.status(400).json({ success: false, code: 'KEY_REQUIRED', message: 'Введите ключ' });
  if (key.length > 96 || !/^[A-Z0-9-]+$/.test(key)) {
    return res.status(400).json({ success: false, code: 'INVALID_KEY_FORMAT', message: 'Некорректный формат ключа' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const licenseResult = await client.query(
      `SELECT id,license_key,status,duration_days
       FROM licenses
       WHERE license_key=$1
       FOR UPDATE`,
      [key]
    );
    const license = licenseResult.rows[0];
    if (!license || String(license.status).toLowerCase() !== 'unused') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, code: 'KEY_INVALID_OR_USED', message: 'Ключ недействителен или уже использован' });
    }

    const userResult = await client.query('SELECT id,subscription FROM users WHERE id=$1 FOR UPDATE', [session.sub]);
    const user = userResult.rows[0];
    if (!user) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, code: 'USER_NOT_FOUND', message: 'Пользователь не найден' });
    }

    const durationDays = Math.max(1, Math.min(3650, Number(license.duration_days) || 30));
    const current = subscriptionInfo(user.subscription);
    const base = current.active ? new Date(current.until) : new Date();
    base.setUTCDate(base.getUTCDate() + durationDays);

    await client.query('UPDATE users SET subscription=$1 WHERE id=$2', [base.toISOString(), session.sub]);
    await client.query(
      "UPDATE licenses SET status='used', used_by=$1, used_at=NOW() WHERE id=$2 AND status='unused'",
      [session.sub, license.id]
    );
    await client.query('COMMIT');

    return res.json({
      success: true,
      message: `Ключ активирован на ${durationDays} дн.`,
      duration: durationDays,
      subscription_until: base.toISOString()
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('activate:', error);
    const failure = databaseFailure(error, 'Ошибка активации ключа');
    return res.status(failure.status).json({ success: false, code: failure.code, message: failure.message });
  } finally {
    client?.release();
  }
}
