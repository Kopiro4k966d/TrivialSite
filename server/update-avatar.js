import pool from './db.js';
import { requireSession } from './auth.js';

export default async function updateAvatar(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });
  const session = requireSession(req, res); if (!session) return;
  const avatar = String(req.body?.avatar || '').trim();
  if (avatar && avatar.length > 1500) return res.status(400).json({ success: false, message: 'Слишком длинный URL' });
  if (avatar && !/^https:\/\//i.test(avatar)) return res.status(400).json({ success: false, message: 'Используйте HTTPS-ссылку' });
  try {
    await pool.query('UPDATE users SET avatar=$1 WHERE id=$2', [avatar || null, session.sub]);
    return res.json({ success: true, message: 'Аватар обновлён', avatar: avatar || null });
  } catch (error) {
    console.error('avatar:', error);
    return res.status(500).json({ success: false, message: 'Ошибка обновления аватара' });
  }
}
