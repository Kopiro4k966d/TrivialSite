import pool from './db.js';
import { requireRole, requireSession } from './auth.js';
import { generateKey } from './utils/generateKeys.js';

export default async function createKey(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });
  const session = requireSession(req, res); if (!session || !requireRole(session, res)) return;
  const duration = Math.max(1, Math.min(3650, Number(req.body?.duration) || 30));
  try {
    const key = generateKey(duration);
    await pool.query("INSERT INTO licenses (license_key,status,duration_days,created_by) VALUES ($1,'unused',$2,$3)", [key, duration, session.sub]);
    return res.json({ success: true, key, duration });
  } catch (error) {
    console.error('create-key:', error);
    return res.status(500).json({ success: false, message: 'Ошибка создания ключа' });
  }
}
