import crypto from 'node:crypto';

const encoder = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const decoder = value => JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));

function secret() {
  const value = String(process.env.SESSION_SECRET || '').trim();
  if (value) return value;
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    const error = new Error('SESSION_SECRET is required in production');
    error.code = 'SESSION_SECRET_MISSING';
    throw error;
  }
  return 'trivial-development-secret-change-me';
}

export function createSessionToken(user, ttlSeconds = 60 * 60 * 24 * 30) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: String(user.id),
    username: user.username,
    role: user.role || 'user',
    iat: now,
    exp: now + ttlSeconds,
    v: 1
  };
  const encoded = encoder(payload);
  const signature = crypto.createHmac('sha256', secret()).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const [encoded, signature, extra] = token.split('.');
    if (!encoded || !signature || extra) return null;
    const expected = crypto.createHmac('sha256', secret()).update(encoded).digest('base64url');
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = decoder(encoded);
    if (!payload?.sub || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (error) {
    if (error?.code === 'SESSION_SECRET_MISSING') throw error;
    return null;
  }
}

export function bearerToken(req) {
  const header = String(req.headers?.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

export function requireSession(req, res) {
  const session = verifySessionToken(bearerToken(req));
  if (!session) {
    res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Требуется вход в аккаунт' });
    return null;
  }
  return session;
}

export function requireRole(session, res, roles = ['creator', 'admin']) {
  if (!session || !roles.includes(String(session.role || '').toLowerCase())) {
    res.status(403).json({ success: false, code: 'ROLE_REQUIRED', message: 'Недостаточно прав' });
    return false;
  }
  return true;
}

export function createLauncherTicket({ userId, hwid, expiresAt }) {
  const payload = encoder({ sub: String(userId), hwid, exp: Math.floor(expiresAt / 1000), type: 'launcher' });
  const signature = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
