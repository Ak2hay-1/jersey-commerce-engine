const NAMED_COLORS: Record<string, string> = {
  orange: '#ea580c',
  red: '#dc2626',
  yellow: '#eab308',
  green: '#16a34a',
  blue: '#2563eb',
  navy: '#1e3a5f',
  'sky blue': '#38bdf8',
  sky: '#38bdf8',
  black: '#111111',
  white: '#f4f4f4',
  grey: '#6b7280',
  gray: '#6b7280',
};

export function colorToHex(name: string): string {
  const key = name.trim().toLowerCase();
  if (NAMED_COLORS[key]) {
    return NAMED_COLORS[key];
  }
  const match = Object.entries(NAMED_COLORS).find(([label]) => key.includes(label));
  return match?.[1] ?? '#ea580c';
}

export type StoreChrome = {
  sizes: string[];
  colours: string[];
  featuredName: string | null;
  featuredSlug: string | null;
};

export const DEFAULT_STORE_CHROME: StoreChrome = {
  sizes: ['S', 'M', 'L', 'XL'],
  colours: ['Orange', 'Black'],
  featuredName: null,
  featuredSlug: null,
};
