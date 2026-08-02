import pool from './db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { username, avatar } = req.body;

    if (!username || !avatar) {
        return res.status(400).json({ success: false, message: 'Не указан пользователь или аватар' });
    }

    try {
        await pool.query('UPDATE users SET avatar = $1 WHERE username = $2', [avatar, username]);
        return res.status(200).json({ success: true, message: 'Аватар успешно обновлен' });
    } catch (error) {
        console.error('Avatar update error:', error);
        return res.status(500).json({ success: false, message: 'Ошибка сервера при обновлении аватара' });
    }
}
