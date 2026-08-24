/**
 * Next static export often skips or mangles routes whose generateStaticParams
 * use literal "[id]" values. Layouts emit "__id__" / "__variantId__" instead;
 * this copies those shells to the "[id]" paths expected by vercel.json / nginx.
 *
 * @param {string} outDir Absolute path to apps/admin/out (or out/<basePath>)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SHELLS = [
  { segment: 'sales', from: '__id__', to: '[id]' },
  { segment: 'orders', from: '__id__', to: '[id]' },
  { segment: 'products', from: '__id__', to: '[id]' },
  { segment: 'purchases', from: '__id__', to: '[id]' },
  { segment: 'suppliers', from: '__id__', to: '[id]' },
  { segment: 'customers', from: '__id__', to: '[id]' },
  { segment: 'expenses', from: '__id__', to: '[id]' },
  { segment: 'custom-orders', from: '__id__', to: '[id]' },
  { segment: 'inventory', from: '__variantId__', to: '[variantId]' },
  { segment: 'promo-codes', from: '__id__', to: '[id]' },
  { segment: 'users', from: '__id__', to: '[id]' },
];

export function ensureAdminDynamicShells(outDir) {
  if (!fs.existsSync(outDir)) {
    throw new Error(`Admin out dir missing: ${outDir}`);
  }

  for (const { segment, from, to } of SHELLS) {
    const src = path.join(outDir, segment, from, 'index.html');
    const destDir = path.join(outDir, segment, to);
    const dest = path.join(destDir, 'index.html');

    if (!fs.existsSync(src)) {
      throw new Error(
        `Missing dynamic shell source ${path.relative(outDir, src)}. ` +
          `Check generateStaticParams for ${segment}.`,
      );
    }

    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);

    const srcDir = path.dirname(src);
    for (const name of fs.readdirSync(srcDir)) {
      if (name === 'index.html') {
        continue;
      }
      const fromPath = path.join(srcDir, name);
      const toPath = path.join(destDir, name);
      if (fs.statSync(fromPath).isFile()) {
        fs.copyFileSync(fromPath, toPath);
      }
    }
  }
}

export function resolveAdminExportRoot(adminOut) {
  const nestedErp = path.join(adminOut, 'erp');
  if (fs.existsSync(path.join(nestedErp, 'index.html'))) {
    return nestedErp;
  }
  return adminOut;
}

const isMain =
  process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isMain) {
  const adminOut = path.resolve(
    process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '../../apps/admin/out'),
  );
  const target = resolveAdminExportRoot(adminOut);
  ensureAdminDynamicShells(target);
  console.log('[ensure-admin-dynamic-shells] Ready at', target);
}
