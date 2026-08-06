import pool from './db.js';
import { requireSession } from './auth.js';
import { publicUser } from './subscription.js';

export default async function profile(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' });
  const session = requireSession(req, res); if (!session) return;
  try {
    const result = await pool.query('SELECT id,username,email,role,subscription,created_at,hwid,avatar FROM users WHERE id=$1 LIMIT 1', [session.sub]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    return res.json({ success: true, user: publicUser(result.rows[0]) });
  } catch (error) {
    console.error('profile:', error);
    return res.status(500).json({ success: false, message: 'Ошибка загрузки профиля' });
  }
}
