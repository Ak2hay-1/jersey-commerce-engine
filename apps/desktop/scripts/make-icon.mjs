import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const src = path.join(root, 'apps/desktop/build/logo.png');
const outDir = path.join(root, 'apps/desktop/dist/.icon-ico');
const outIco = path.join(root, 'apps/desktop/build/icon.ico');

fs.mkdirSync(outDir, { recursive: true });

const sizes = [16, 32, 48, 64, 128, 256];
const pngBuffers = [];
for (const size of sizes) {
  const buf = await sharp(src).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  pngBuffers.push({ size, buf });
  fs.writeFileSync(path.join(outDir, `${size}x${size}.png`), buf);
}

// Minimal ICO writer (PNG-compressed images)
function writeIco(images) {
  const headerSize = 6;
  const dirEntrySize = 16;
  const offset0 = headerSize + dirEntrySize * images.length;
  let offset = offset0;
  const entries = [];
  for (const img of images) {
    entries.push({
      width: img.size >= 256 ? 0 : img.size,
      height: img.size >= 256 ? 0 : img.size,
      bytes: img.buf.length,
      offset,
    });
    offset += img.buf.length;
  }
  const out = Buffer.alloc(offset);
  out.writeUInt16LE(0, 0);
  out.writeUInt16LE(1, 2);
  out.writeUInt16LE(images.length, 4);
  let dir = headerSize;
  for (const e of entries) {
    out[dir] = e.width;
    out[dir + 1] = e.height;
    out[dir + 2] = 0;
    out[dir + 3] = 0;
    out.writeUInt16LE(1, dir + 4);
    out.writeUInt16LE(32, dir + 6);
    out.writeUInt32LE(e.bytes, dir + 8);
    out.writeUInt32LE(e.offset, dir + 12);
    dir += dirEntrySize;
  }
  let pos = offset0;
  for (const img of images) {
    img.buf.copy(out, pos);
    pos += img.buf.length;
  }
  return out;
}

fs.writeFileSync(outIco, writeIco(pngBuffers));
fs.copyFileSync(outIco, path.join(outDir, 'icon.ico'));
console.log('Wrote', outIco, 'and', outDir);
