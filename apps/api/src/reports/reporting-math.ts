import { Prisma } from '../prisma/client';
import { money, moneyString, roundMoney } from '../pos/pos-money';

export function rawMoney(value: unknown): Prisma.Decimal {
  if (value == null) {
    return money(0);
  }
  return money(String(value));
}

export function rawMoneyString(value: unknown): string {
  return moneyString(rawMoney(value));
}

export function rawCount(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function grossProfit(revenue: Prisma.Decimal, cogs: Prisma.Decimal): Prisma.Decimal {
  return roundMoney(revenue.sub(cogs));
}

export function marginPercent(revenue: Prisma.Decimal, profit: Prisma.Decimal): Prisma.Decimal {
  if (revenue.isZero()) {
    return money(0);
  }
  return roundMoney(profit.mul(100).div(revenue));
}

export function profitability(revenue: Prisma.Decimal, cogs: Prisma.Decimal) {
  const profit = grossProfit(revenue, cogs);
  return {
    revenue: moneyString(roundMoney(revenue)),
    cogs: moneyString(roundMoney(cogs)),
    grossProfit: moneyString(profit),
    marginPercent: moneyString(marginPercent(revenue, profit)),
  };
}

export function paymentGroupSql(): Prisma.Sql {
  return Prisma.sql`
    CASE
      WHEN method IN ('CASH', 'UPI', 'CARD', 'ONLINE') THEN method::text
      ELSE 'OTHER'
    END
  `;
}
