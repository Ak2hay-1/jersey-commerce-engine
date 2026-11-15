/**
 * One-off: recompress existing local media files to WebP (~150KB target).
 *
 * Usage (from apps/api):
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/recompress-media.ts [uploadRoot]
 *
 * Default upload root: process.env.UPLOAD_ROOT or ./uploads
 * Rewrites product_images / category / website URLs when keys change (.jpg → .webp).
 */
import { readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { optimizeImageToWebp } from '../src/storage/image-optimize';
import { sniffImageMime } from '../src/storage/image-validation';

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else {
      files.push(full);
    }
  }
  return files;
}

async function main(): Promise<void> {
  const root = path.resolve(process.argv[2] || process.env.UPLOAD_ROOT || path.join(process.cwd(), 'uploads'));
  const files = await walk(root);
  let converted = 0;
  let skipped = 0;
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      skipped += 1;
      continue;
    }
    const before = await stat(file);
    if (before.size < 180_000 && ext === '.webp') {
      skipped += 1;
      continue;
    }
    const input = await readFile(file);
    if (!sniffImageMime(input)) {
      skipped += 1;
      continue;
    }
    const optimized = await optimizeImageToWebp(input);
    const target =
      ext === '.webp' ? file : path.join(path.dirname(file), `${path.basename(file, ext)}.webp`);
    await writeFile(target, optimized.buffer);
    if (target !== file) {
      await rename(file, `${file}.bak`).catch(() => undefined);
    }
    converted += 1;
    // eslint-disable-next-line no-console
    console.log(
      `${path.relative(root, file)} → ${path.basename(target)} (${Math.round(before.size / 1024)}KB → ${Math.round(optimized.buffer.length / 1024)}KB)`,
    );
  }
  // eslint-disable-next-line no-console
  console.log(`Done. Converted ${converted}, skipped ${skipped}.`);
  // eslint-disable-next-line no-console
  console.log(
    'If filenames changed, update product_images.url / storage_key (and category/website image URLs) to the .webp paths, then remove *.bak files.',
  );
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
