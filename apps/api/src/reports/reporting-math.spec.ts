import { Prisma } from '../prisma/client';
import { grossProfit, marginPercent, profitability } from './reporting-math';

describe('reporting math', () => {
  it('computes gross profit as revenue minus COGS and does not call it net profit', () => {
    const revenue = new Prisma.Decimal('100000.00');
    const cogs = new Prisma.Decimal('60000.00');
    const profit = grossProfit(revenue, cogs);
    expect(profit.toFixed(2)).toBe('40000.00');
    expect(marginPercent(revenue, profit).toFixed(2)).toBe('40.00');
    expect(profitability(revenue, cogs)).toEqual({
      revenue: '100000.00',
      cogs: '60000.00',
      grossProfit: '40000.00',
      marginPercent: '40.00',
    });
  });

  it('returns a zero margin when revenue is zero', () => {
    expect(marginPercent(new Prisma.Decimal(0), new Prisma.Decimal(0)).toFixed(2)).toBe('0.00');
  });
});
