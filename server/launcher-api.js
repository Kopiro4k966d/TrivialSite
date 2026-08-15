import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool, { databaseFailure } from './db.js';
import { createLauncherTicket, requireSession } from './auth.js';
import { publicUser, subscriptionInfo } from './subscription.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

async function loadUser(session) {
  const result = await pool.query('SELECT id,username,email,role,subscription_until AS subscription,hwid,avatar,created_at FROM users WHERE id=$1 LIMIT 1', [session.sub]);
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

function fail(res, error, message) {
  const failure = databaseFailure(error, message);
  return res.status(failure.status).json({ success: false, code: failure.code, message: failure.message });
}

export async function subscriptionCheck(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
  const session = requireSession(req, res); if (!session) return;
  try {
    const row = await loadUser(session);
    if (!row) return res.status(404).json({ success: false, code: 'USER_NOT_FOUND', message: 'Пользователь не найден' });
    return res.json({ success: true, user: publicUser(row), subscription: subscriptionInfo(row.subscription), manifest: manifest() });
  } catch (error) {
    console.error('subscription:', error);
    return fail(res, error, 'Ошибка проверки подписки');
  }
}

export async function launcherSession(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
  const session = requireSession(req, res); if (!session) return;
  const hwid = String(req.body?.hwid || '').trim().toLowerCase();
  if (!/^[a-f0-9]{32,128}$/.test(hwid)) return res.status(400).json({ success: false, code: 'INVALID_HWID', message: 'Некорректный HWID' });

  try {
    const row = await loadUser(session);
    if (!row) return res.status(404).json({ success: false, code: 'USER_NOT_FOUND', message: 'Пользователь не найден' });
    const sub = subscriptionInfo(row.subscription);
    if (!sub.active) return res.status(403).json({ success: false, code: 'SUBSCRIPTION_REQUIRED', message: 'Подписка не активна' });

    const bound = await pool.query(
      `UPDATE users SET hwid=$1
       WHERE id=$2 AND (hwid IS NULL OR LOWER(hwid)=LOWER($1))
       RETURNING id,username,email,role,subscription_until AS subscription,hwid,avatar,created_at`,
      [hwid, session.sub]
    );
    if (!bound.rows.length) {
      return res.status(403).json({ success: false, code: 'HWID_MISMATCH', message: 'Аккаунт привязан к другому устройству' });
    }

    const expiresAt = Date.now() + 5 * 60_000;
    const ticket = createLauncherTicket({ userId: session.sub, hwid, expiresAt });
    return res.json({
      success: true,
      ticket,
      expiresIn: 300,
      expiresAt: new Date(expiresAt).toISOString(),
      user: publicUser(bound.rows[0]),
      manifest: manifest()
    });
  } catch (error) {
    console.error('launcher-session:', error);
    return fail(res, error, 'Ошибка запуска сессии');
  }
}

export async function downloadLauncher(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
  const session = requireSession(req, res); if (!session) return;
  try {
    const row = await loadUser(session);
    if (!row || !subscriptionInfo(row.subscription).active) return res.status(403).json({ success: false, code: 'SUBSCRIPTION_REQUIRED', message: 'Скачивание доступно только при активной подписке' });
    if (process.env.LAUNCHER_DOWNLOAD_URL) return res.redirect(302, process.env.LAUNCHER_DOWNLOAD_URL);
    const configured = process.env.LAUNCHER_FILE_PATH;
    const filePath = configured ? path.resolve(configured) : path.join(root, 'storage', 'launcher', 'DecideVisualsLauncher.zip');
    if (!fs.existsSync(filePath)) return res.status(503).json({ success: false, code: 'LAUNCHER_NOT_PUBLISHED', message: 'Сборка лаунчера ещё не опубликована' });
    const stat = fs.statSync(filePath);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Length', String(stat.size));
    res.setHeader('Content-Disposition', 'attachment; filename="DecideVisualsLauncher.zip"');
    res.setHeader('Cache-Control', 'private, no-store');
    return fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('download-launcher:', error);
    return fail(res, error, 'Ошибка скачивания');
  }
}

export async function clientManifest(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
  const session = requireSession(req, res); if (!session) return;
  try {
    const row = await loadUser(session);
    if (!row || !subscriptionInfo(row.subscription).active) return res.status(403).json({ success: false, code: 'SUBSCRIPTION_REQUIRED', message: 'Подписка не активна' });
    return res.json({ success: true, manifest: manifest() });
  } catch (error) {
    console.error('manifest:', error);
    return fail(res, error, 'Ошибка манифеста');
  }
}
