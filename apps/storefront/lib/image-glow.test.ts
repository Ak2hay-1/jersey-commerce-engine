import { describe, expect, it } from 'vitest';
import { hexLightness, pickGlowColor } from './image-glow';

function pixels(colors: Array<[number, number, number, number?]>): Uint8ClampedArray {
  const data = new Uint8ClampedArray(colors.length * 4);
  colors.forEach(([r, g, b, a = 255], index) => {
    data.set([r, g, b, a], index * 4);
  });
  return data;
}

function repeat<T>(value: T, count: number): T[] {
  return Array.from({ length: count }, () => value);
}

describe('pickGlowColor', () => {
  it('picks a deep red for a red kit on a grey backdrop', () => {
    const color = pickGlowColor(
      pixels([...repeat<[number, number, number]>([150, 150, 155], 60), ...repeat<[number, number, number]>([210, 20, 30], 40)]),
    );
    expect(color).not.toBeNull();
    const value = Number.parseInt(color!.slice(1), 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    expect(r).toBeGreaterThan(g * 2);
    expect(r).toBeGreaterThan(b * 2);
    expect(hexLightness(color!)).toBeLessThanOrEqual(0.425);
  });

  it('returns null for a grey image', () => {
    expect(pickGlowColor(pixels(repeat<[number, number, number]>([128, 128, 130], 100)))).toBeNull();
  });

  it('ignores transparent pixels', () => {
    expect(pickGlowColor(pixels(repeat<[number, number, number, number]>([0, 0, 255, 0], 50)))).toBeNull();
  });

  it('keeps bright colors dark enough for white text', () => {
    const color = pickGlowColor(pixels(repeat<[number, number, number]>([120, 200, 255], 50)));
    expect(color).not.toBeNull();
    expect(hexLightness(color!)).toBeLessThanOrEqual(0.425);
    expect(hexLightness(color!)).toBeGreaterThanOrEqual(0.295);
  });
});
