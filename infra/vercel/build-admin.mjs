/**
 * Build Admin static export for Vercel (portal=admin) and write runtime-config.js.
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
import { ensureAdminDynamicShells, resolveAdminExportRoot } from './ensure-admin-dynamic-shells.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const adminRoot = path.join(repoRoot, 'apps/admin');
const outDir = path.join(adminRoot, 'out');
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

const runtimeBody = `window.__JCE_PUBLIC__={apiUrl:"${apiUrl.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}",portal:"admin"};\n`;
fs.writeFileSync(publicRuntime, runtimeBody, 'utf8');
console.log('[vercel-admin] Wrote', publicRuntime);

run('npm', ['run', 'build:packages']);
run('npm', ['run', 'build', '-w', '@jersey-commerce/admin'], {
  NEXT_PUBLIC_API_URL: apiUrl,
  NEXT_PUBLIC_PORTAL: 'admin',
  NEXT_PUBLIC_BASE_PATH: '',
});

if (!fs.existsSync(path.join(outDir, 'index.html'))) {
  console.error('[vercel-admin] Missing out/index.html after build');
  process.exit(1);
}

const exportRoot = resolveAdminExportRoot(outDir);
ensureAdminDynamicShells(exportRoot);
console.log('[vercel-admin] Ensured dynamic [id] shells under', exportRoot);

fs.writeFileSync(path.join(outDir, 'runtime-config.js'), runtimeBody, 'utf8');
console.log('[vercel-admin] Admin static export ready at', outDir);
