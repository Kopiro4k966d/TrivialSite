import pool, { databaseFailure } from './db.js';
import { requireSession } from './auth.js';

export default async function updateAvatar(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
  const session = requireSession(req, res); if (!session) return;
  const avatar = String(req.body?.avatar || '').trim();
  if (avatar.length > 1500) return res.status(400).json({ success: false, code: 'AVATAR_URL_TOO_LONG', message: 'Слишком длинный URL' });
  if (avatar) {
    try {
      const url = new URL(avatar);
      if (url.protocol !== 'https:') throw new Error('HTTPS required');
      if (url.username || url.password) throw new Error('Credentials are not allowed');
    } catch {
      return res.status(400).json({ success: false, code: 'INVALID_AVATAR_URL', message: 'Укажите корректную HTTPS-ссылку' });
    }
  }
  try {
    const result = await pool.query('UPDATE users SET avatar=$1 WHERE id=$2 RETURNING id', [avatar || null, session.sub]);
    if (!result.rows.length) return res.status(404).json({ success: false, code: 'USER_NOT_FOUND', message: 'Пользователь не найден' });
    return res.json({ success: true, message: avatar ? 'Аватар обновлён' : 'Аватар удалён', avatar: avatar || null });
  } catch (error) {
    console.error('avatar:', error);
    const failure = databaseFailure(error, 'Ошибка обновления аватара');
    return res.status(failure.status).json({ success: false, code: failure.code, message: failure.message });
  }
}
