export function formatMoney(value: string | number | null | undefined, currency = 'INR'): string {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat('en-IN').format(value ?? 0);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function statusLabel(value: string): string {
  return value.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (char) => char.toUpperCase());
}

export function parseMoney(value: string | number | null | undefined): number {
  const amount = typeof value === 'number' ? value : Number.parseFloat(value ?? '0');
  if (!Number.isFinite(amount)) {
    return 0;
  }
  return Math.round(amount * 100) / 100;
}

export function moneyString(value: number): string {
  return parseMoney(value).toFixed(2);
}

export function moneySum(values: Array<string | number>): number {
  return parseMoney(values.reduce<number>((sum, value) => sum + parseMoney(value), 0));
}

export function remainingDue(total: string, applied: Array<string | number>): string {
  return moneyString(parseMoney(total) - moneySum(applied));
}
