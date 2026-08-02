import bcrypt from 'bcryptjs';
import pool from './db.js';
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ success:false, message:'Method not allowed' });
  try {
    const username = String(req.body?.username || '').trim(); const email = String(req.body?.email || '').trim().toLowerCase(); const password = String(req.body?.password || '');
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return res.status(400).json({ success:false, message:'Логин: 3–24 символа, латиница, цифры и _' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ success:false, message:'Некорректный e-mail' });
    if (password.length < 6) return res.status(400).json({ success:false, message:'Пароль должен содержать минимум 6 символов' });
    const exists = await pool.query('SELECT 1 FROM users WHERE LOWER(username)=LOWER($1) OR LOWER(email)=LOWER($2) LIMIT 1', [username,email]);
    if (exists.rows.length) return res.status(409).json({ success:false, message:'Логин или e-mail уже используется' });
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query("INSERT INTO users (username,email,password,role,subscription) VALUES ($1,$2,$3,'user',NULL) RETURNING id,username,email,role,subscription,hwid,avatar,created_at", [username,email,hash]);
    return res.status(201).json({ success:true, message:'Аккаунт создан', user:result.rows[0] });
  } catch (error) { console.error(error); return res.status(500).json({ success:false, message: process.env.DATABASE_URL ? 'Ошибка сервера' : 'Не задан DATABASE_URL' }); }
}
