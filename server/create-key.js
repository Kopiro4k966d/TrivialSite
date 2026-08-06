import pool from './db.js';
import { requireRole, requireSession } from './auth.js';
import { generateKey } from './utils/generateKeys.js';

export default async function createKey(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });
  const session = requireSession(req, res); if (!session || !requireRole(session, res)) return;
  const duration = Math.max(1, Math.min(3650, Number(req.body?.duration) || 30));
  try {
    // Ensure license storage exists after fresh database setup
    await pool.query(`
      CREATE TABLE IF NOT EXISTS licenses (
        id BIGSERIAL PRIMARY KEY,
        license_key VARCHAR(96) NOT NULL UNIQUE,
        status VARCHAR(16) NOT NULL DEFAULT 'unused',
        duration_days INTEGER NOT NULL DEFAULT 30,
        created_by BIGINT NULL,
        used_by BIGINT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        used_at TIMESTAMPTZ NULL
      )
    `);
    const key = generateKey(duration);
    await pool.query(
      "INSERT INTO licenses (license_key,status,duration_days,created_by) VALUES ($1,'unused',$2,$3)",
      [key, duration, session.sub]
    );
    return res.json({ success: true, key, duration });
  } catch (error) {
    console.error('create-key:', error);
    return res.status(500).json({ success: false, message: 'Ошибка создания ключа' });
  }
}
