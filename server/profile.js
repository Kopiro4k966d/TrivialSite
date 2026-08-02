import pool from './db.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { username } = req.query;

    if (!username) {
        return res.status(400).json({ success: false, message: 'Не указан пользователь' });
    }

    try {
        const query = `
            SELECT id, username, email, role, subscription, created_at, hwid, avatar 
            FROM users 
            WHERE username = $1
        `;
        const result = await pool.query(query, [username]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }

        const user = result.rows[0];

        return res.status(200).json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                subscription: user.subscription || 'Не активна',
                created_at: user.created_at,
                hwid: user.hwid || null,
                avatar: user.avatar || null,
                avatar_url: user.avatar || null
            }
        });

    } catch (error) {
        console.error('Profile fetch error:', error);
        return res.status(500).json({ success: false, message: 'Ошибка сервера при получении профиля' });
    }
}
