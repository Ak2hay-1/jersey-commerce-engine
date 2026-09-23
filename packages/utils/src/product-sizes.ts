/** Canonical adult apparel ladder used by Admin presets and storefront display. */
export const ADULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;

/** Canonical kids numeric sizes used by Admin presets. */
export const KIDS_SIZES = ['6', '8', '10', '12', '14'] as const;

/** Letter / XL-family ranks (case-insensitive). 2XL shares XXL rank. */
const LETTER_RANK: Record<string, number> = {
  XS: 10,
  S: 20,
  M: 30,
  L: 40,
  XL: 50,
  XXL: 60,
  '2XL': 60,
  '3XL': 70,
  '4XL': 80,
  '5XL': 90,
};

function normalizeSizeToken(value: string): string {
  return value.trim().toUpperCase();
}

function sizeRank(value: string): { kind: 'letter' | 'numeric' | 'unknown'; rank: number } {
  const token = normalizeSizeToken(value);
  if (!token) {
    return { kind: 'unknown', rank: Number.POSITIVE_INFINITY };
  }
  const letter = LETTER_RANK[token];
  if (letter !== undefined) {
    return { kind: 'letter', rank: letter };
  }
  if (/^\d+$/.test(token)) {
    return { kind: 'numeric', rank: Number.parseInt(token, 10) };
  }
  return { kind: 'unknown', rank: Number.POSITIVE_INFINITY };
}

/**
 * Apparel-aware size compare: XS→S→M→L→XL→XXL/2XL→3XL…, then numeric kids ascending,
 * then unknown labels via case-insensitive localeCompare.
 */
export function compareProductSizes(a: string, b: string): number {
  const left = sizeRank(a);
  const right = sizeRank(b);

  if (left.kind === 'letter' && right.kind === 'letter') {
    return left.rank - right.rank || a.localeCompare(b, 'en', { sensitivity: 'base' });
  }
  if (left.kind === 'letter') {
    return -1;
  }
  if (right.kind === 'letter') {
    return 1;
  }
  if (left.kind === 'numeric' && right.kind === 'numeric') {
    return left.rank - right.rank;
  }
  if (left.kind === 'numeric') {
    return -1;
  }
  if (right.kind === 'numeric') {
    return 1;
  }
  return a.localeCompare(b, 'en', { sensitivity: 'base' });
}

/** Deduplicate (first occurrence) then sort with {@link compareProductSizes}. */
export function sortUniqueSizes(values: Iterable<string | null | undefined>): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (!value) {
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    const key = normalizeSizeToken(trimmed);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(trimmed);
  }
  return unique.sort(compareProductSizes);
}
