const FORBIDDEN_KEYS = [
  'cardnumber',
  'card_number',
  'pan',
  'cvv',
  'cvc',
  'csc',
  'pin',
  'track',
  'track1',
  'track2',
  'track3',
  'magnetic',
  'magneticstripe',
  'stripe',
  'fullnumber',
  'accountnumber',
];

function isForbiddenKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return FORBIDDEN_KEYS.some((item) => normalized.includes(item));
}

export function sanitizePaymentMetadata(
  input: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!input) {
    return {};
  }
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (isForbiddenKey(key)) {
      continue;
    }
    if (typeof value === 'string' && value.replace(/\s/g, '').length >= 12 && /^\d[\d\s-]{11,}$/.test(value)) {
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      safe[key] = sanitizePaymentMetadata(value as Record<string, unknown>);
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

export function normalizeReference(value?: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}
