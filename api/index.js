import login from '../server/login.js';
import register from '../server/register.js';
import profile from '../server/profile.js';
import updateAvatar from '../server/update-avatar.js';
import activate from '../server/activate.js';
import createKey from '../server/create-key.js';
import stats from '../server/stats.js';
import { clientManifest, downloadLauncher, launcherSession, subscriptionCheck } from '../server/launcher-api.js';

function cors(req, res) {
  const configured = String(process.env.ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean);
  const origin = String(req.headers?.origin || '');
  if (!origin || configured.length === 0 || configured.includes(origin)) {
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const path = (req.url || '').split('?')[0].replace(/^\/api\/?/, '').replace(/\/+$/, '');
  if (path === 'health') return res.json({ success: true, service: 'Trivial API', time: new Date().toISOString() });
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
  return res.status(404).json({ success: false, message: 'API route not found' });
}
