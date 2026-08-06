import bcrypt from 'bcryptjs';
import pool from './db.js';
import { createSessionToken } from './auth.js';
import { publicUser } from './subscription.js';
import { rateLimit } from './rate-limit.js';

export default async function register(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });
  if (!rateLimit(req, res, { key: 'register', limit: 6, windowMs: 60_000 })) return;
  const username = String(req.body?.username || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return res.status(400).json({ success: false, message: 'Логин: 3–24 символа, латиница, цифры и _' });
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 160) return res.status(400).json({ success: false, message: 'Некорректный e-mail' });
  if (password.length < 8 || password.length > 128) return res.status(400).json({ success: false, message: 'Пароль должен содержать 8–128 символов' });
  try {
    const exists = await pool.query('SELECT 1 FROM users WHERE LOWER(username)=LOWER($1) OR LOWER(email)=LOWER($2) LIMIT 1', [username, email]);
    if (exists.rows.length) return res.status(409).json({ success: false, message: 'Логин или e-mail уже используется' });
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      "INSERT INTO users (username,email,password,role,subscription) VALUES ($1,$2,$3,'user',NULL) RETURNING id,username,email,role,subscription,hwid,avatar,created_at",
      [username, email, hash]
    );
    const row = result.rows[0];
    return res.status(201).json({ success: true, message: 'Аккаунт создан', token: createSessionToken(row), user: publicUser(row) });
  } catch (error) {
    console.error('register:', error);
    return res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
}
