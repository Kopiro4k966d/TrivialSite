import bcrypt from 'bcryptjs';
import pool from './db.js';
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ success:false, message:'Method not allowed' });
  try {
    const login = String(req.body?.username || req.body?.email || '').trim();
    const password = String(req.body?.password || '');
    if (!login || !password) return res.status(400).json({ success:false, message:'Заполните все поля' });
    const result = await pool.query('SELECT id, username, email, password, role, subscription, hwid, avatar, created_at FROM users WHERE LOWER(username)=LOWER($1) OR LOWER(email)=LOWER($1) LIMIT 1', [login]);
    if (!result.rows.length || !(await bcrypt.compare(password, result.rows[0].password))) return res.status(401).json({ success:false, message:'Неверный логин или пароль' });
    const { password: _, ...user } = result.rows[0];
    return res.status(200).json({ success:true, message:'Вход выполнен', user });
  } catch (error) { console.error(error); return res.status(500).json({ success:false, message: process.env.DATABASE_URL ? 'Ошибка сервера' : 'Не задан DATABASE_URL' }); }
}
