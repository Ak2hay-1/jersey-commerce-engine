import { Prisma } from '../prisma/client';
import { allocateProportional, splitTax, unitShare } from './tax';

const d = (value: string) => new Prisma.Decimal(value);

describe('tax foundation', () => {
  it('extracts tax from inclusive pricing without changing the payable total', () => {
    const result = splitTax(d('1980.00'), d('10'), true);
    expect(result.total.toFixed(2)).toBe('1980.00');
    expect(result.tax.toFixed(2)).toBe('180.00');
    expect(result.pretax.toFixed(2)).toBe('1800.00');
  });

  it('adds tax for exclusive pricing', () => {
    const result = splitTax(d('1800.00'), d('10'), false);
    expect(result.tax.toFixed(2)).toBe('180.00');
    expect(result.total.toFixed(2)).toBe('1980.00');
  });

  it('uses a zero rate without inventing tax', () => {
    const result = splitTax(d('850.00'), d('0'), true);
    expect(result.tax.toFixed(2)).toBe('0.00');
    expect(result.total.toFixed(2)).toBe('850.00');
  });

  it('allocates cart discount so the last line absorbs rounding remainder', () => {
    const shares = allocateProportional([d('10.00'), d('10.00'), d('10.00')], d('10.00'));
    const sum = shares.reduce((acc, share) => acc.add(share), d('0'));
    expect(sum.toFixed(2)).toBe('10.00');
    expect(shares.map((share) => share.toFixed(2))).toEqual(['3.33', '3.33', '3.34']);
  });

  it('computes a proportional refund without exceeding the original line total', () => {
    expect(unitShare(d('900.00'), 3, 1).toFixed(2)).toBe('300.00');
    expect(unitShare(d('900.00'), 3, 3).toFixed(2)).toBe('900.00');
  });
});
