import bcrypt from 'bcryptjs';
import pool, { databaseFailure } from './db.js';
import { createSessionToken } from './auth.js';
import { publicUser } from './subscription.js';
import { rateLimit } from './rate-limit.js';

export default async function register(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
  if (!rateLimit(req, res, { key: 'register', limit: 6, windowMs: 60_000 })) return;
  const username = String(req.body?.username || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return res.status(400).json({ success: false, code: 'INVALID_USERNAME', message: 'Логин: 3–24 символа, латиница, цифры и _' });
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 160) return res.status(400).json({ success: false, code: 'INVALID_EMAIL', message: 'Некорректный e-mail' });
  if (password.length < 8 || password.length > 128) return res.status(400).json({ success: false, code: 'INVALID_PASSWORD', message: 'Пароль должен содержать 8–128 символов' });
  try {
    const exists = await pool.query('SELECT 1 FROM users WHERE LOWER(username)=LOWER($1) OR LOWER(email)=LOWER($2) LIMIT 1', [username, email]);
    if (exists.rows.length) return res.status(409).json({ success: false, code: 'ACCOUNT_EXISTS', message: 'Логин или e-mail уже используется' });
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      "INSERT INTO users (username,email,password,role,subscription_until) VALUES ($1,$2,$3,'user',NULL) RETURNING id,username,email,role,subscription_until AS subscription,hwid,avatar,created_at",
      [username, email, hash]
    );
    const row = result.rows[0];
    return res.status(201).json({ success: true, message: 'Аккаунт создан', token: createSessionToken(row), user: publicUser(row) });
  } catch (error) {
    if (error?.code === 'SESSION_SECRET_MISSING') throw error;
    console.error('register:', error);
    if (error?.code === '23505') return res.status(409).json({ success: false, code: 'ACCOUNT_EXISTS', message: 'Логин или e-mail уже используется' });
    const failure = databaseFailure(error, 'Ошибка регистрации');
    return res.status(failure.status).json({ success: false, code: failure.code, message: failure.message });
  }
}
