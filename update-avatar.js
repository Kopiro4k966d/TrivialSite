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

try {
  const vercel = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'));
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));

  if (pkg.engines?.node !== '24.x') {
    failed = true;
    console.error(`Node.js version must be pinned to 24.x for Vercel; found ${pkg.engines?.node || 'none'}.`);
  }

  if ('functions' in vercel) {
    failed = true;
    console.error('Vercel config must not use automatic functions configuration in this deployment mode.');
  }

  const nodeBuilds = (vercel.builds || []).filter(build => build.use === '@vercel/node');
  if (nodeBuilds.length !== 1 || nodeBuilds[0].src !== 'api-handler.js') {
    failed = true;
    console.error(`Vercel Hobby check failed: expected exactly one explicit @vercel/node build for api-handler.js; found ${JSON.stringify(nodeBuilds)}.`);
  }

  if (!existing.has('api-handler.js')) {
    failed = true;
    console.error('api-handler.js is missing.');
  }

  const apiJsFiles = [...existing].filter(name => name.startsWith('api/') && name.endsWith('.js'));
  if (apiJsFiles.length) {
    failed = true;
    console.error(`Clean archive must not contain auto-detected /api JavaScript functions: ${apiJsFiles.join(', ')}`);
  }

  const serializedRoutes = JSON.stringify(vercel.routes || []);
  if (!serializedRoutes.includes('/api-handler.js?__route=$1')) {
    failed = true;
    console.error('Vercel API catch-all route is missing.');
  }

  const routeList = vercel.routes || [];
  const filesystemIndex = routeList.findIndex(route => route.handle === 'filesystem');
  const catchAllIndex = routeList.findIndex(route => route.src === '/.*');
  if (filesystemIndex === -1) {
    failed = true;
    console.error('Vercel filesystem handler is missing; CSS/JS/images would be swallowed by the 404 catch-all.');
  } else if (catchAllIndex !== -1 && filesystemIndex > catchAllIndex) {
    failed = true;
    console.error('Vercel filesystem handler must run before the 404 catch-all.');
  }

  const htmlFiles = files.filter(file => file.endsWith('.html'));
  for (const file of htmlFiles) {
    const html = await readFile(file, 'utf8');
    const relativeAsset = html.match(/(?:src|href)=["'](?:css|js|img)\//i);
    if (relativeAsset) {
      failed = true;
      console.error(`Asset URLs must be root-absolute for clean routes: ${path.relative(root, file)}`);
    }
  }
} catch (error) {
  failed = true;
  console.error(`Invalid Vercel/package configuration: ${error.message}`);
}

if (failed) process.exit(1);


// Validate every relative ESM import target. This catches deployment-time/runtime
// crashes such as importing ../server/* from a handler that already lives in root.
const relativeImportPattern = /(?:from\s+|import\s*\()(['"])(\.{1,2}\/[^'"]+)\1/g;
for (const file of files.filter(file => file.endsWith('.js'))) {
  const source = await readFile(file, 'utf8');
  let match;
  while ((match = relativeImportPattern.exec(source))) {
    const target = path.resolve(path.dirname(file), match[2]);
    try {
      await stat(target);
    } catch {
      failed = true;
      console.error(`Missing relative import: ${path.relative(root, file)} -> ${match[2]}`);
    }
  }
}

if (failed) process.exit(1);

console.log(`Checks passed: ${files.length} files.`);
