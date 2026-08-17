import { Prisma } from '../prisma/client';
import { applyDiscount, expectedCash, money, roundMoney } from './pos-money';

describe('POS discounts', () => {
  it('applies a fixed discount without exceeding the base', () => {
    const result = applyDiscount(money('850.00'), 'FIXED', money('100.00'));
    expect(result.discountAmount.toFixed(2)).toBe('100.00');
    expect(result.net.toFixed(2)).toBe('750.00');
  });

  it('applies a percentage discount rounded to two decimals', () => {
    const result = applyDiscount(money('899.00'), 'PERCENTAGE', money('10'));
    expect(result.discountAmount.toFixed(2)).toBe('89.90');
    expect(result.net.toFixed(2)).toBe('809.10');
  });

  it('rejects negative, over-100 percent, and oversized fixed discounts', () => {
    expect(() => applyDiscount(money('100'), 'FIXED', money('-1'))).toThrow('Discount cannot be negative.');
    expect(() => applyDiscount(money('100'), 'PERCENTAGE', money('150'))).toThrow(
      'Percentage discount must be between 0 and 100.',
    );
    expect(() => applyDiscount(money('100'), 'FIXED', money('120'))).toThrow(
      'Discount cannot exceed the applicable amount.',
    );
  });
});

describe('POS expected cash', () => {
  it('adds cash sales to opening cash and subtracts cash refunds', () => {
    expect(expectedCash(money('5000'), money('20000'), money('2000')).toFixed(2)).toBe('23000.00');
  });

  it('ignores non-cash methods by not accepting them as arguments', () => {
    expect(expectedCash(money('5000'), money('850'), money(0)).toFixed(2)).toBe('5850.00');
  });

  it('rounds using half-up decimal money', () => {
    expect(roundMoney(new Prisma.Decimal('10.005')).toFixed(2)).toBe('10.01');
  });
});
