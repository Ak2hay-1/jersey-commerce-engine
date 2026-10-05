import { colorToHex } from '../../lib/swatch';

export type JerseyPattern = 'solid' | 'stripes' | 'hoops' | 'sash';

export type JerseyDesign = {
  primary: string;
  secondary: string;
  trim: string;
  pattern: JerseyPattern;
  name: string;
  number: string;
  crest: string;
};

export const DEFAULT_JERSEY_DESIGN: JerseyDesign = {
  primary: '#ea580c',
  secondary: '#111111',
  trim: '#f4f4f4',
  pattern: 'solid',
  name: 'JERZYFY',
  number: '10',
  crest: 'J',
};

function parseHex(hex: string): [number, number, number] {
  const raw = hex.replace('#', '').trim();
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : raw.padEnd(6, '0').slice(0, 6);
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

export function contrastInk(hex: string): string {
  return luminance(hex) > 0.45 ? '#111111' : '#f4f4f4';
}

function patternFor(seed: string): JerseyPattern {
  const key = seed.toLowerCase();
  if (key.includes('stripe')) {
    return 'stripes';
  }
  if (key.includes('hoop')) {
    return 'hoops';
  }
  if (key.includes('sash')) {
    return 'sash';
  }
  return 'solid';
}

/** Derives a kit look from catalogue data: colour names drive the palette, product name hints the pattern. */
export function designFromProduct({
  name,
  colours,
  activeColour,
  crest,
}: {
  name?: string | null;
  colours?: string[];
  activeColour?: string | null;
  crest?: string | null;
}): JerseyDesign {
  const palette = (colours ?? []).filter(Boolean);
  const primaryName = activeColour ?? palette[0] ?? null;
  const secondaryName = palette.find((colour) => colour !== primaryName) ?? null;
  const primary = primaryName ? colorToHex(primaryName) : DEFAULT_JERSEY_DESIGN.primary;
  const secondary = secondaryName ? colorToHex(secondaryName) : contrastInk(primary) === '#111111' ? '#1e3a5f' : '#111111';
  return {
    ...DEFAULT_JERSEY_DESIGN,
    primary,
    secondary,
    trim: contrastInk(primary),
    pattern: patternFor(name ?? ''),
    crest: (crest?.trim()?.[0] ?? DEFAULT_JERSEY_DESIGN.crest).toUpperCase(),
  };
}
