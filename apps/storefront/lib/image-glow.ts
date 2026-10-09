const HUE_BUCKETS = 24;
const MIN_SATURATION = 0.2;
const MIN_COLORED_SHARE = 0.04;
const SAMPLE_WIDTH = 32;
const SAMPLE_HEIGHT = 40;

type Hsl = { h: number; s: number; l: number };

function rgbToHsl(r: number, g: number, b: number): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) {
    return { h: 0, s: 0, l };
  }
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) {
    h = ((gn - bn) / d) % 6;
  } else if (max === gn) {
    h = (bn - rn) / d + 2;
  } else {
    h = (rn - gn) / d + 4;
  }
  h *= 60;
  if (h < 0) {
    h += 360;
  }
  return { h, s, l };
}

function hslToHex({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const toHex = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexLightness(hex: string): number {
  const value = Number.parseInt(hex.slice(1), 16);
  return rgbToHsl((value >> 16) & 255, (value >> 8) & 255, value & 255).l;
}

/**
 * Picks a deep, readable stage color from RGBA pixels. Grey, white and black pixels
 * (mannequins, studio backdrops) are ignored; returns null when the image has no clear color.
 */
export function pickGlowColor(pixels: Uint8ClampedArray): string | null {
  const buckets = Array.from({ length: HUE_BUCKETS }, () => ({ weight: 0, r: 0, g: 0, b: 0 }));
  let total = 0;
  let colored = 0;

  for (let i = 0; i + 3 < pixels.length; i += 4) {
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;
    const a = pixels[i + 3]!;
    if (a < 128) {
      continue;
    }
    total += 1;
    const { h, s, l } = rgbToHsl(r, g, b);
    if (s < MIN_SATURATION || l < 0.08 || l > 0.92) {
      continue;
    }
    colored += 1;
    const bucket = buckets[Math.floor(h / (360 / HUE_BUCKETS)) % HUE_BUCKETS]!;
    bucket.weight += s;
    bucket.r += r * s;
    bucket.g += g * s;
    bucket.b += b * s;
  }

  if (total === 0 || colored / total < MIN_COLORED_SHARE) {
    return null;
  }

  const best = buckets.reduce((top, bucket) => (bucket.weight > top.weight ? bucket : top));
  if (best.weight === 0) {
    return null;
  }
  const hsl = rgbToHsl(best.r / best.weight, best.g / best.weight, best.b / best.weight);
  return hslToHex({
    h: hsl.h,
    s: Math.max(hsl.s, 0.55),
    l: Math.min(Math.max(hsl.l, 0.3), 0.42),
  });
}

const cache = new Map<string, Promise<string | null>>();

function sampleUrl(src: string): string {
  if (src.startsWith('data:') || src.includes('placehold.co')) {
    return src;
  }
  return `/_next/image?url=${encodeURIComponent(src)}&w=64&q=50`;
}

export function loadGlowColor(src: string): Promise<string | null> {
  const cached = cache.get(src);
  if (cached) {
    return cached;
  }
  const pending = new Promise<string | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = SAMPLE_WIDTH;
        canvas.height = SAMPLE_HEIGHT;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
        resolve(pickGlowColor(ctx.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT).data));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = sampleUrl(src);
  });
  cache.set(src, pending);
  return pending;
}
