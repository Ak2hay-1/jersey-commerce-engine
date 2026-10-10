import { formatMoney, moneyString, parseMoney } from './format';

export interface TenderDraft {
  method: string;
  amount: string;
  amountReceived: string;
  reference: string;
}

/** Returns a cashier-facing error, or null when the tenders exactly cover the total. */
export function validateTenders(total: string, rows: TenderDraft[]): string | null {
  if (rows.length === 0) {
    return 'Add at least one payment.';
  }
  const totalValue = parseMoney(total);
  let applied = 0;
  for (const row of rows) {
    const raw = row.amount.trim();
    if (!raw && rows.length > 1) {
      return 'Enter an amount for every split payment.';
    }
    const value = raw ? Number(raw) : totalValue;
    if (!Number.isFinite(value) || value <= 0) {
      return 'Each payment amount must be greater than zero.';
    }
    applied += parseMoney(value);
  }
  const appliedCents = Math.round(applied * 100);
  const totalCents = Math.round(totalValue * 100);
  if (appliedCents < totalCents) {
    return `Payments are short by ${formatMoney(moneyString(totalValue - applied))}.`;
  }
  if (appliedCents > totalCents) {
    return `Payments exceed the total by ${formatMoney(moneyString(applied - totalValue))}.`;
  }
  for (const row of rows) {
    if ((row.method === 'UPI' || row.method === 'CARD') && !row.reference.trim()) {
      return `${row.method} requires a transaction reference.`;
    }
    if (row.method === 'CASH') {
      const amount = parseMoney(row.amount || total);
      const received = parseMoney(row.amountReceived || row.amount || total);
      if (received < amount) {
        return 'Cash received must be at least the amount applied.';
      }
    }
  }
  return null;
}
