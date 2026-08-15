const UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseExpirationToMs(value: string): number {
  const match = /^(\d+)(ms|s|m|h|d)$/i.exec(value.trim());
  if (match?.[1] && match[2]) {
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    const multiplier = UNIT_MS[unit];
    if (multiplier) {
      return amount * multiplier;
    }
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric * 1000;
  }
  throw new Error(`Invalid expiration value: ${value}`);
}

export function parseExpirationToSeconds(value: string): number {
  return Math.floor(parseExpirationToMs(value) / 1000);
}
