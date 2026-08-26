import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureAdminDynamicShells, ensurePosDynamicShells, resolveAdminExportRoot } from '../../../infra/vercel/ensure-admin-dynamic-shells.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(desktopRoot, '../..');
const rendererRoot = path.join(desktopRoot, 'renderer');

function readApiUrl() {
  const configPath = path.join(desktopRoot, 'config.json');
  const fallback = 'http://localhost:4000';
  if (!fs.existsSync(configPath)) {
    return fallback;
  }
  try {
    const raw = fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, '');
    const parsed = JSON.parse(raw);
    if (typeof parsed.apiUrl === 'string' && parsed.apiUrl.trim()) {
      return parsed.apiUrl.trim().replace(/\/$/, '');
    }
  } catch {
    // ignore
  }
  return fallback;
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

function writeRuntimeConfig(targetDir, apiUrl, portal) {
  const portalPart = portal ? `,portal:"${portal}"` : '';
  const body = `window.__JCE_PUBLIC__={apiUrl:"${apiUrl.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"${portalPart}};\n`;
  fs.writeFileSync(path.join(targetDir, 'runtime-config.js'), body, 'utf8');
}

const apiUrl = readApiUrl();
const skipBuild = process.env.DESKTOP_SKIP_BUILD === '1';

console.log(`[desktop] API URL: ${apiUrl}`);

if (!skipBuild) {
  console.log('[desktop] Building shared packages…');
  run('npm', ['run', 'build:packages']);

  console.log('[desktop] Building POS (basePath=/pos)…');
  run('npm', ['run', 'build', '-w', '@jersey-commerce/pos'], {
    NEXT_PUBLIC_BASE_PATH: '/pos',
    NEXT_PUBLIC_API_URL: apiUrl,
  });

  console.log('[desktop] Building ERP (basePath=/erp, portal=erp)…');
  run('npm', ['run', 'build', '-w', '@jersey-commerce/admin'], {
    NEXT_PUBLIC_BASE_PATH: '/erp',
    NEXT_PUBLIC_PORTAL: 'erp',
    NEXT_PUBLIC_API_URL: apiUrl,
  });
}

const posOut = path.join(repoRoot, 'apps/pos/out');
const erpOut = path.join(repoRoot, 'apps/admin/out');

if (!fs.existsSync(posOut) || !fs.existsSync(erpOut)) {
  console.error('[desktop] Missing static export folders. Run without DESKTOP_SKIP_BUILD=1.');
  process.exit(1);
}

ensureAdminDynamicShells(resolveAdminExportRoot(erpOut));
console.log('[desktop] Ensured ERP dynamic [id] shells');

function copyExport(outDir, baseSegment, dest) {
  const nested = path.join(outDir, baseSegment);
  if (fs.existsSync(path.join(nested, 'index.html'))) {
    copyDir(nested, dest);
    // Some Next versions leave shared assets at out/_next while HTML lives under out/<base>.
    const rootNext = path.join(outDir, '_next');
    if (fs.existsSync(rootNext) && !fs.existsSync(path.join(dest, '_next'))) {
      fs.cpSync(rootNext, path.join(dest, '_next'), { recursive: true });
    }
    return;
  }
  if (fs.existsSync(path.join(outDir, 'index.html'))) {
    copyDir(outDir, dest);
    return;
  }
  console.error(`[desktop] No index.html in ${outDir} (or ${nested})`);
  process.exit(1);
}

fs.mkdirSync(rendererRoot, { recursive: true });
copyExport(posOut, 'pos', path.join(rendererRoot, 'pos'));
ensurePosDynamicShells(path.join(rendererRoot, 'pos'));
copyExport(erpOut, 'erp', path.join(rendererRoot, 'erp'));
writeRuntimeConfig(path.join(rendererRoot, 'pos'), apiUrl, undefined);
writeRuntimeConfig(path.join(rendererRoot, 'erp'), apiUrl, 'erp');

console.log('[desktop] Renderer ready at', rendererRoot);
