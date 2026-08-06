import login from '../server/login.js';
import register from '../server/register.js';
import profile from '../server/profile.js';
import updateAvatar from '../server/update-avatar.js';
import activate from '../server/activate.js';
import createKey from '../server/create-key.js';
import stats from '../server/stats.js';
import pool, { databaseConfigured, databaseFailure } from '../server/db.js';
import { ensureSchema, schemaReady } from '../server/schema.js';
import { clientManifest, downloadLauncher, launcherSession, subscriptionCheck } from '../server/launcher-api.js';

const databaseRoutes = new Set([
  'login', 'register', 'profile', 'update-avatar', 'activate', 'create-key', 'stats',
  'subscription/check', 'launcher/session', 'download/launcher', 'client/manifest', 'status'
]);

function requestOrigin(req) {
  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '').split(',')[0].trim();
  const proto = String(req.headers?.['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https')).split(',')[0].trim();
  return host ? `${proto}://${host}` : '';
}

function cors(req, res) {
  const configured = String(process.env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  const origin = String(req.headers?.origin || '');
  const sameOrigin = !origin || origin === requestOrigin(req);
  const allowed = sameOrigin || configured.includes(origin);

  if (origin && allowed) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  return allowed;
}

function routePath(req) {
  const pathname = new URL(req.url || '/', 'http://local').pathname;
  return pathname
    .replace(/^\/api(?:\/|$)/, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
}

async function parseBody(req) {
  if (!['POST', 'PUT', 'PATCH'].includes(String(req.method || '').toUpperCase())) return;
  const type = String(req.headers?.['content-type'] || '').toLowerCase();

  let raw;
  if (Buffer.isBuffer(req.body)) raw = req.body.toString('utf8');
  else if (typeof req.body === 'string') raw = req.body;
  else if (req.body !== undefined && req.body !== null) return;
  else {
    raw = '';
    for await (const chunk of req) {
      raw += chunk;
      if (Buffer.byteLength(raw) > 262_144) {
        const error = new Error('Request body too large');
        error.code = 'BODY_TOO_LARGE';
        throw error;
      }
    }
  }

  if (!raw) {
    req.body = {};
    return;
  }
  if (type.includes('application/json')) {
    try {
      req.body = JSON.parse(raw);
    } catch {
      const error = new Error('Invalid JSON');
      error.code = 'INVALID_JSON';
      throw error;
    }
  } else if (type.includes('application/x-www-form-urlencoded')) {
    req.body = Object.fromEntries(new URLSearchParams(raw));
  } else {
    req.body = raw;
  }
}

function configurationFailure(error) {
  if (error?.code === 'SESSION_SECRET_MISSING') {
    return {
      status: 503,
      body: {
        success: false,
        code: 'SESSION_SECRET_MISSING',
        message: 'На сервере не задан SESSION_SECRET. Добавьте длинный случайный секрет в Vercel.'
      }
    };
  }
  if (error?.code === 'INVALID_JSON') {
    return { status: 400, body: { success: false, code: 'INVALID_JSON', message: 'Некорректный JSON в запросе' } };
  }
  if (error?.code === 'BODY_TOO_LARGE') {
    return { status: 413, body: { success: false, code: 'BODY_TOO_LARGE', message: 'Слишком большой запрос' } };
  }
  const failure = databaseFailure(error, 'Внутренняя ошибка API');
  return { status: failure.status, body: { success: false, code: failure.code, message: failure.message } };
}

export default async function handler(req, res) {
  try {
    if (!cors(req, res)) return res.status(403).json({ success: false, code: 'ORIGIN_NOT_ALLOWED', message: 'Источник запроса не разрешён' });
    if (req.method === 'OPTIONS') return res.status(204).end();

    await parseBody(req);
    const path = routePath(req);

    if (path === 'health') {
      return res.json({
        success: true,
        service: 'Trivial API',
        databaseConfigured,
        time: new Date().toISOString()
      });
    }

    if (databaseRoutes.has(path)) await ensureSchema();

    if (path === 'status') {
      await pool.query('SELECT 1');
      if (!(await schemaReady())) {
        return res.status(503).json({ success: false, code: 'DATABASE_SCHEMA_ERROR', message: 'Структура базы данных не готова' });
      }
      return res.json({ success: true, service: 'Trivial API', database: 'ok', schema: 'ok', time: new Date().toISOString() });
    }
    if (path === 'login') return login(req, res);
    if (path === 'register') return register(req, res);
    if (path === 'profile') return profile(req, res);
    if (path === 'update-avatar') return updateAvatar(req, res);
    if (path === 'activate') return activate(req, res);
    if (path === 'create-key') return createKey(req, res);
    if (path === 'stats') return stats(req, res);
    if (path === 'subscription/check') return subscriptionCheck(req, res);
    if (path === 'launcher/session') return launcherSession(req, res);
    if (path === 'download/launcher') return downloadLauncher(req, res);
    if (path === 'client/manifest') return clientManifest(req, res);
    return res.status(404).json({ success: false, code: 'ROUTE_NOT_FOUND', message: 'API route not found' });
  } catch (error) {
    console.error('api handler:', error);
    if (res.headersSent) return res.end();
    const failure = configurationFailure(error);
    return res.status(failure.status).json(failure.body);
  }
}
