/**
 * Build unified Staff portal for Vercel (Admin + ERP + POS) and write runtime-config.js.
 *
 * - Admin/ERP at site root with portal=all
 * - POS nested under /pos (same pattern as desktop prepare-renderer)
 *
 * Required env:
 *   NEXT_PUBLIC_API_URL  e.g. https://api.yourshop.com
 * Optional:
 *   NEXT_PUBLIC_DEFAULT_TENANT_SLUG
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureAdminDynamicShells, ensurePosDynamicShells, resolveAdminExportRoot } from './ensure-admin-dynamic-shells.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const adminRoot = path.join(repoRoot, 'apps/admin');
const outDir = path.join(adminRoot, 'out');
const posOut = path.join(repoRoot, 'apps/pos/out');
const publicRuntime = path.join(adminRoot, 'public', 'runtime-config.js');

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/$/, '');
if (!apiUrl) {
  console.error('NEXT_PUBLIC_API_URL is required (e.g. https://api.yourshop.com)');
  process.exit(1);
}

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function copyDir(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

/** Copy a Next static export that may nest under out/<baseSegment>. */
function copyExport(exportOutDir, baseSegment, dest) {
  const nested = path.join(exportOutDir, baseSegment);
  if (fs.existsSync(path.join(nested, 'index.html'))) {
    copyDir(nested, dest);
    const rootNext = path.join(exportOutDir, '_next');
    if (fs.existsSync(rootNext) && !fs.existsSync(path.join(dest, '_next'))) {
      fs.cpSync(rootNext, path.join(dest, '_next'), { recursive: true });
    }
    return;
  }
  if (fs.existsSync(path.join(exportOutDir, 'index.html'))) {
    copyDir(exportOutDir, dest);
    return;
  }
  console.error(`[vercel-staff] No index.html in ${exportOutDir} (or ${nested})`);
  process.exit(1);
}

const runtimeBody = `window.__JCE_PUBLIC__={apiUrl:"${apiUrl.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}",portal:"all"};\n`;
fs.writeFileSync(publicRuntime, runtimeBody, 'utf8');
console.log('[vercel-staff] Wrote', publicRuntime);

run('npm', ['run', 'build:packages']);

console.log('[vercel-staff] Building staff Admin+ERP (portal=all)…');
run('npm', ['run', 'build', '-w', '@jersey-commerce/admin'], {
  NEXT_PUBLIC_API_URL: apiUrl,
  NEXT_PUBLIC_PORTAL: 'all',
  NEXT_PUBLIC_BASE_PATH: '',
});

if (!fs.existsSync(path.join(outDir, 'index.html'))) {
  console.error('[vercel-staff] Missing out/index.html after admin build');
  process.exit(1);
}

const exportRoot = resolveAdminExportRoot(outDir);
ensureAdminDynamicShells(exportRoot);
console.log('[vercel-staff] Ensured and asserted dynamic [id] shells under', exportRoot);

fs.writeFileSync(path.join(outDir, 'runtime-config.js'), runtimeBody, 'utf8');

console.log('[vercel-staff] Building POS (basePath=/pos)…');
run('npm', ['run', 'build', '-w', '@jersey-commerce/pos'], {
  NEXT_PUBLIC_API_URL: apiUrl,
  NEXT_PUBLIC_BASE_PATH: '/pos',
});

if (!fs.existsSync(posOut)) {
  console.error('[vercel-staff] Missing apps/pos/out after POS build');
  process.exit(1);
}

const posDest = path.join(outDir, 'pos');
copyExport(posOut, 'pos', posDest);
ensurePosDynamicShells(posDest);
fs.writeFileSync(path.join(posDest, 'runtime-config.js'), runtimeBody, 'utf8');
console.log('[vercel-staff] Nested POS at', posDest);

console.log('[vercel-staff] Staff static export ready at', outDir);
