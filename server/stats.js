import pool, { databaseFailure } from './db.js';
import { requireSession } from './auth.js';
import { requireCurrentRole } from './permissions.js';

export default async function stats(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
  const session = requireSession(req, res);
  if (!session) return;

  try {
    const creator = await requireCurrentRole(session, res);
    if (!creator) return;

    const [users, active, keys] = await Promise.all([
      pool.query('SELECT COUNT(*)::int count FROM users'),
      pool.query('SELECT COUNT(*)::int count FROM users WHERE subscription > NOW()'),
      pool.query("SELECT COUNT(*)::int count FROM licenses WHERE status='unused'")
    ]);
    return res.json({
      success: true,
      users: users.rows[0].count,
      activeSubscriptions: active.rows[0].count,
      unusedKeys: keys.rows[0].count
    });
  } catch (error) {
    console.error('stats:', error);
    const failure = databaseFailure(error, 'Ошибка статистики');
    return res.status(failure.status).json({ success: false, code: failure.code, message: failure.message });
  }
}
