import pool, { databaseFailure } from './db.js';
import { requireSession } from './auth.js';
import { requireCurrentRole } from './permissions.js';
import { generateKey } from './utils/generateKeys.js';

export default async function createKey(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
  const session = requireSession(req, res);
  if (!session) return;

  const duration = Number(req.body?.duration);
  if (!Number.isInteger(duration) || duration < 1 || duration > 3650) {
    return res.status(400).json({ success: false, code: 'INVALID_DURATION', message: 'Срок ключа должен быть целым числом от 1 до 3650 дней' });
  }

  try {
    const creator = await requireCurrentRole(session, res);
    if (!creator) return;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const key = generateKey(duration);
      try {
        const result = await pool.query(
          `INSERT INTO licenses (license_key,status,duration_days,created_by)
           VALUES ($1,'unused',$2,$3)
           RETURNING id,license_key,duration_days,created_at`,
          [key, duration, creator.id]
        );
        const created = result.rows[0];
        return res.status(201).json({
          success: true,
          key: created.license_key,
          duration: Number(created.duration_days),
          createdAt: created.created_at
        });
      } catch (error) {
        if (error?.code === '23505' && attempt < 4) continue;
        throw error;
      }
    }

    return res.status(500).json({ success: false, code: 'KEY_GENERATION_FAILED', message: 'Не удалось создать уникальный ключ' });
  } catch (error) {
    console.error('create-key:', error);
    const failure = databaseFailure(error, 'Ошибка создания ключа');
    return res.status(failure.status).json({ success: false, code: failure.code, message: failure.message });
  }
}
