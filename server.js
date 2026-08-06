import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import apiHandler from './api/index.js';

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit: '256kb' }));
app.use('/api', (req, res) => apiHandler(req, res));
app.use('/storage', (_req, res) => res.status(404).send('Not found'));
for (const blocked of ['/server', '/database', '/scripts']) {
  app.use(blocked, (_req, res) => res.status(404).send('Not found'));
}
app.get(['/package.json', '/package-lock.json', '/vercel.json', '/server.js', '/.env', '/.env.example'], (_req, res) => res.status(404).send('Not found'));
app.use(express.static(root, {
  index: 'index.html',
  extensions: ['html'],
  dotfiles: 'deny',
  setHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('X-Frame-Options', 'DENY');
  }
}));
app.use((_req, res) => res.status(404).sendFile(path.join(root, '404.html')));
app.use((error, _req, res, _next) => {
  console.error('express:', error);
  if (res.headersSent) return res.end();
  return res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: 'Внутренняя ошибка сервера' });
});

app.listen(port, () => console.log(`Trivial site: http://localhost:${port}`));
