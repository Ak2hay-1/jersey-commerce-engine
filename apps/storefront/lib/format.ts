export function formatMoney(amount: string | null | undefined, currency = 'INR'): string {
  if (!amount) {
    return '';
  }
  const value = Number(amount);
  if (Number.isNaN(value)) {
    return amount;
  }
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(0)}`;
  }
}

export function discountPercent(price: string, compareAt: string | null | undefined): number | null {
  if (!compareAt) {
    return null;
  }
  const current = Number(price);
  const was = Number(compareAt);
  if (!was || was <= current) {
    return null;
  }
  return Math.round(((was - current) / was) * 100);
}

export function availabilityLabel(
  availability: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK',
  remaining: number | null,
): string {
  if (availability === 'OUT_OF_STOCK') {
    return 'Out of stock';
  }
  if (availability === 'LOW_STOCK' && remaining != null) {
    return `Only ${remaining} left`;
  }
  return 'In stock';
}
