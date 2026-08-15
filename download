import pool from './db.js';

export async function requireCurrentRole(session, res, roles = ['creator', 'admin']) {
  const result = await pool.query('SELECT id, username, role FROM users WHERE id=$1 LIMIT 1', [session.sub]);
  const user = result.rows[0];
  if (!user) {
    res.status(401).json({ success: false, code: 'SESSION_USER_NOT_FOUND', message: 'Сессия устарела. Войдите снова.' });
    return null;
  }
  const role = String(user.role || 'user').toLowerCase();
  if (!roles.includes(role)) {
    res.status(403).json({ success: false, code: 'ROLE_REQUIRED', message: 'Недостаточно прав' });
    return null;
  }
  return { ...user, role };
}
