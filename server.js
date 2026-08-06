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
app.use('/api', apiHandler);
app.use('/storage', (_req, res) => res.status(404).send('Not found'));
app.use(express.static(root, {
  index: 'index.html',
  extensions: ['html'],
  dotfiles: 'deny',
  setHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  }
}));
app.use((req, res) => res.status(404).sendFile(path.join(root, 'index.html')));

app.listen(port, () => console.log(`Trivial site: http://localhost:${port}`));
