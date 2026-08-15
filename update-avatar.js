import bcrypt from 'bcryptjs';
import pool, { databaseFailure } from './db.js';
import { createSessionToken } from './auth.js';
import { publicUser } from './subscription.js';
import { rateLimit } from './rate-limit.js';

export default async function login(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
  if (!rateLimit(req, res, { key: 'login', limit: 12, windowMs: 60_000 })) return;
  const loginValue = String(req.body?.username || req.body?.email || '').trim();
  const password = String(req.body?.password || '');
  if (!loginValue || !password) return res.status(400).json({ success: false, code: 'FIELDS_REQUIRED', message: 'Заполните все поля' });
  try {
    const result = await pool.query(
      'SELECT id, username, email, password, role, subscription_until AS subscription, hwid, avatar, created_at FROM users WHERE LOWER(username)=LOWER($1) OR LOWER(email)=LOWER($1) LIMIT 1',
      [loginValue]
    );
    const row = result.rows[0];
    if (!row || !(await bcrypt.compare(password, row.password))) {
      return res.status(401).json({ success: false, code: 'INVALID_CREDENTIALS', message: 'Неверный логин или пароль' });
    }
    const user = publicUser(row);
    return res.json({ success: true, message: 'Вход выполнен', token: createSessionToken(row), user });
  } catch (error) {
    if (error?.code === 'SESSION_SECRET_MISSING') throw error;
    console.error('login:', error);
    const failure = databaseFailure(error, 'Ошибка входа');
    return res.status(failure.status).json({ success: false, code: failure.code, message: failure.message });
  }
}
