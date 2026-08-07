import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ignored = new Set(['node_modules', '.git']);
const files = [];

async function walk(dir) {
  for (const name of await readdir(dir)) {
    if (ignored.has(name)) continue;
    const full = path.join(dir, name);
    const info = await stat(full);
    if (info.isDirectory()) await walk(full);
    else files.push(full);
  }
}

await walk(root);
let failed = false;
for (const file of files.filter(file => file.endsWith('.js'))) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failed = true;
    console.error(result.stderr || result.stdout);
  }
}

const existing = new Set(files.map(file => path.relative(root, file).replaceAll('\\', '/')));
const attrPattern = /(?:src|href)="([^"]+)"/g;

function staticCandidate(ref) {
  const clean = ref.split(/[?#]/)[0];
  if (!clean || clean === '/') return 'index.html';
  const normalized = clean.replace(/^\//, '');
  if (existing.has(normalized)) return normalized;
  if (!path.extname(normalized) && existing.has(`${normalized}.html`)) return `${normalized}.html`;
  return normalized;
}

for (const file of files.filter(file => file.endsWith('.html'))) {
  const html = await readFile(file, 'utf8');
  for (const match of html.matchAll(attrPattern)) {
    const ref = match[1];
    if (/^(?:https?:|mailto:|#|data:|javascript:)/i.test(ref)) continue;
    const candidate = staticCandidate(ref);
    if (!existing.has(candidate)) {
      failed = true;
      console.error(`Missing asset/page: ${path.relative(root, file)} -> ${ref}`);
    }
  }
}

const internalHtmlRefs = [];
for (const file of files.filter(file => /\.(?:html|js)$/i.test(file))) {
  const content = await readFile(file, 'utf8');
  const matches = content.match(/(?:href\s*=\s*["']|location(?:\.href|\.replace)?\s*[=(]\s*["'`])[^"'`]*\.html/gi);
  if (matches) internalHtmlRefs.push(path.relative(root, file));
}
if (internalHtmlRefs.length) {
  failed = true;
  console.error(`Clean URL check failed in: ${internalHtmlRefs.join(', ')}`);
}

if (failed) process.exit(1);
console.log(`Checks passed: ${files.length} files.`);
