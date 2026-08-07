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

// Vercel routing regression checks.
try {
  const vercel = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'));
  if (vercel.cleanUrls === true) {
    const serialized = JSON.stringify(vercel.rewrites || vercel.routes || []);
    if (/\.html/.test(serialized)) {
      failed = true;
      console.error('Vercel routing check failed: cleanUrls=true must not be combined with .html rewrite destinations.');
    }
  }

  const apiJsFiles = [...existing].filter(name => name.startsWith('api/') && name.endsWith('.js'));
  if (apiJsFiles.length !== 1 || apiJsFiles[0] !== 'api/index.js') {
    failed = true;
    console.error(`Vercel Hobby check failed: expected exactly one API function (api/index.js), found: ${apiJsFiles.join(', ') || 'none'}`);
  }

  const fnConfig = Object.keys(vercel.functions || {});
  if (fnConfig.length !== 1 || fnConfig[0] !== 'api/index.js') {
    failed = true;
    console.error(`Vercel functions config must contain only api/index.js, found: ${fnConfig.join(', ') || 'none'}`);
  }

  const serializedRoutes = JSON.stringify(vercel.routes || []);
  if (!serializedRoutes.includes('/api/index.js?__route=$1')) {
    failed = true;
    console.error('Vercel API catch-all route is missing.');
  }

  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  if (pkg.engines?.node !== '24.x') {
    failed = true;
    console.error(`Node.js version must be pinned to 24.x for Vercel; found ${pkg.engines?.node || 'none'}.`);
  }
} catch (error) {
  failed = true;
  console.error(`Invalid Vercel/package configuration: ${error.message}`);
}

if (failed) process.exit(1);

console.log(`Checks passed: ${files.length} files.`);
