export function normalizePhone(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const digits = value.replace(/\D/g, '');
  if (!digits) {
    return null;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

export function normalizeEmail(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  return trimmed.length === 0 ? null : trimmed;
}

export function looksLikePhoneSearch(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 6 && digits.length >= value.replace(/[\s+\-().]/g, '').length * 0.7;
}

export function phoneSearchDigits(value: string): string | null {
  return normalizePhone(value);
}
