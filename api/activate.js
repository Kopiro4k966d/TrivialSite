import pool from './db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { key, hwid, username } = req.body;

    if (!key || !hwid || !username) {
        return res.status(400).json({ success: false, message: 'Заполните все поля (ключ, hwid, username)' });
    }

    try {
        // 1. Проверяем ключ в таблице licenses
        const keyResult = await pool.query('SELECT * FROM licenses WHERE license_key = $1', [key]);
        
        if (keyResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Недействительный лицензионный ключ' });
        }

        const keyData = keyResult.rows[0];

        // Проверяем, не использован ли уже этот ключ
        if (keyData.hwid || (keyData.status && keyData.status === 'used')) {
            return res.status(400).json({ success: false, message: 'Этот ключ уже был активирован' });
        }

        // 2. Проверяем пользователя в таблице users
        const userResult = await pool.query('SELECT hwid, subscription FROM users WHERE username = $1', [username]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }

        const user = userResult.rows[0];

        // Если у пользователя уже зафиксирован другой HWID — блокируем доступ с чужого ПК
        if (user.hwid && user.hwid !== hwid) {
            return res.status(400).json({ success: false, message: 'Этот аккаунт уже привязан к другому устройству (HWID)!' });
        }

        // 3. Вычисляем новую дату подписки (добавляем 30 дней, с суммированием если старая еще активна)
        const durationDays = Number(keyData.duration_days) || 30; 
        let baseDate = new Date();
        if (user.subscription && new Date(user.subscription) > baseDate) {
            baseDate = new Date(user.subscription);
        }
        baseDate.setDate(baseDate.getDate() + durationDays);
        const newSubscriptionDate = baseDate.toISOString().split('T')[0];

        // 4. Обновляем пользователя: сохраняем HWID (навсегда, если его не было) и продлеваем подписку
        await pool.query(
            'UPDATE users SET hwid = COALESCE(hwid, $1), subscription = $2 WHERE username = $3',
            [hwid, newSubscriptionDate, username]
        );

        // 5. Помечаем ключ как использованный в таблице licenses
        await pool.query('UPDATE licenses SET hwid = $1, status = $2 WHERE license_key = $3', [hwid, 'used', key]);

        return res.status(200).json({
            success: true,
            message: 'Ключ успешно активирован!',
            subscription_until: newSubscriptionDate,
            hwid: user.hwid || hwid
        });

    } catch (error) {
        console.error('Activation error:', error);
        return res.status(500).json({ success: false, message: 'Ошибка сервера при активации ключа' });
    }
}
