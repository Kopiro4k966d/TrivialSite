import pool from './db.js';
import { requireRole, requireSession } from './auth.js';

export default async function stats(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' });
  const session = requireSession(req, res); if (!session || !requireRole(session, res)) return;
  try {
    const [users, active, keys] = await Promise.all([
      pool.query('SELECT COUNT(*)::int count FROM users'),
      pool.query('SELECT COUNT(*)::int count FROM users WHERE subscription > NOW()'),
      pool.query("SELECT COUNT(*)::int count FROM licenses WHERE status='unused'")
    ]);
    return res.json({ success: true, users: users.rows[0].count, activeSubscriptions: active.rows[0].count, unusedKeys: keys.rows[0].count });
  } catch (error) {
    console.error('stats:', error);
    return res.status(500).json({ success: false, message: 'Ошибка статистики' });
  }
}
