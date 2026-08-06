import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pool from './db.js';
import { requireSession } from './auth.js';
import { publicUser, subscriptionInfo } from './subscription.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

async function loadUser(session) {
  const result = await pool.query('SELECT id,username,email,role,subscription,hwid,avatar,created_at FROM users WHERE id=$1 LIMIT 1', [session.sub]);
  return result.rows[0] || null;
}

function manifest() {
  const minecraftVersion = process.env.MINECRAFT_VERSION || '1.21.11';
  const fabricLoaderVersion = process.env.FABRIC_LOADER_VERSION || '0.19.1';
  return {
    launcherVersion: process.env.LAUNCHER_VERSION || '2.0.0',
    clientVersion: process.env.CLIENT_VERSION || '2.0.0',
    minecraftVersion,
    fabricLoaderVersion,
    customVersion: `fabric-loader-${fabricLoaderVersion}-${minecraftVersion}`,
    clientUrl: process.env.CLIENT_DOWNLOAD_URL || null,
    clientSha256: process.env.CLIENT_SHA256 || null,
    fabricInstallerUrl: process.env.FABRIC_INSTALLER_URL || 'https://maven.fabricmc.net/net/fabricmc/fabric-installer/1.0.3/fabric-installer-1.0.3.jar',
    fabricApiUrl: process.env.FABRIC_API_DOWNLOAD_URL || 'https://maven.fabricmc.net/net/fabricmc/fabric-api/fabric-api/0.141.3+1.21.11/fabric-api-0.141.3+1.21.11.jar',
    fabricApiSha256: process.env.FABRIC_API_SHA256 || null,
    newsUrl: process.env.NEWS_URL || null,
    requiredJava: 21
  };
}

export async function subscriptionCheck(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' });
  const session = requireSession(req, res); if (!session) return;
  try {
    const row = await loadUser(session);
    if (!row) return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    return res.json({ success: true, user: publicUser(row), subscription: subscriptionInfo(row.subscription), manifest: manifest() });
  } catch (error) {
    console.error('subscription:', error);
    return res.status(500).json({ success: false, message: 'Ошибка проверки подписки' });
  }
}

export async function launcherSession(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });
  const session = requireSession(req, res); if (!session) return;
  const hwid = String(req.body?.hwid || '').trim();
  if (!/^[a-f0-9]{32,128}$/i.test(hwid)) return res.status(400).json({ success: false, message: 'Некорректный HWID' });
  try {
    const row = await loadUser(session);
    if (!row) return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    const sub = subscriptionInfo(row.subscription);
    if (!sub.active) return res.status(403).json({ success: false, code: 'SUBSCRIPTION_REQUIRED', message: 'Подписка не активна' });
    if (row.hwid && row.hwid !== hwid) return res.status(403).json({ success: false, code: 'HWID_MISMATCH', message: 'Аккаунт привязан к другому устройству' });
    if (!row.hwid) await pool.query('UPDATE users SET hwid=$1 WHERE id=$2 AND hwid IS NULL', [hwid, session.sub]);
    const ticketPayload = `${session.sub}:${hwid}:${Date.now()}`;
    const ticket = crypto.createHash('sha256').update(ticketPayload).digest('hex');
    return res.json({ success: true, ticket, expiresIn: 300, user: publicUser({ ...row, hwid }), manifest: manifest() });
  } catch (error) {
    console.error('launcher-session:', error);
    return res.status(500).json({ success: false, message: 'Ошибка запуска сессии' });
  }
}

export async function downloadLauncher(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' });
  const session = requireSession(req, res); if (!session) return;
  try {
    const row = await loadUser(session);
    if (!row || !subscriptionInfo(row.subscription).active) return res.status(403).json({ success: false, code: 'SUBSCRIPTION_REQUIRED', message: 'Скачивание доступно только при активной подписке' });
    if (process.env.LAUNCHER_DOWNLOAD_URL) return res.redirect(302, process.env.LAUNCHER_DOWNLOAD_URL);
    const configured = process.env.LAUNCHER_FILE_PATH;
    const filePath = configured ? path.resolve(configured) : path.join(root, 'storage', 'launcher', 'TrivialLauncher.zip');
    if (!fs.existsSync(filePath)) return res.status(503).json({ success: false, message: 'Сборка лаунчера ещё не опубликована' });
    const stat = fs.statSync(filePath);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Length', String(stat.size));
    res.setHeader('Content-Disposition', 'attachment; filename="TrivialLauncher.zip"');
    res.setHeader('Cache-Control', 'private, no-store');
    return fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('download-launcher:', error);
    return res.status(500).json({ success: false, message: 'Ошибка скачивания' });
  }
}

export async function clientManifest(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' });
  const session = requireSession(req, res); if (!session) return;
  try {
    const row = await loadUser(session);
    if (!row || !subscriptionInfo(row.subscription).active) return res.status(403).json({ success: false, code: 'SUBSCRIPTION_REQUIRED', message: 'Подписка не активна' });
    return res.json({ success: true, manifest: manifest() });
  } catch (error) {
    console.error('manifest:', error);
    return res.status(500).json({ success: false, message: 'Ошибка манифеста' });
  }
}
