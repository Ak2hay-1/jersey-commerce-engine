import { PromoDiscountType, PROMO_CODE_STATUSES, PROMO_DISCOUNT_TYPES } from '@jersey-commerce/types';
import { applyDiscount, money } from '../pos/pos-money';
import { assertPromoApplicable, generatePromoCode, normalizePromoCode, type PromoSnapshot } from './promo-code.engine';

describe('promo-code.engine', () => {
  const base: PromoSnapshot = {
    status: 'ACTIVE',
    discountType: 'PERCENTAGE',
    discountValue: money('10'),
    minSubtotal: null,
    maxDiscount: null,
    usageLimit: null,
    usageCount: 0,
    startsAt: null,
    endsAt: null,
  };

  it('applies a percentage discount', () => {
    const resolved = assertPromoApplicable(base, money('1000.00'));
    expect(resolved.discountType).toBe('PERCENTAGE');
    expect(resolved.discountAmount.toFixed(2)).toBe('100.00');
  });

  it('caps a percentage discount at maxDiscount', () => {
    const resolved = assertPromoApplicable({ ...base, maxDiscount: money('50.00') }, money('1000.00'));
    expect(resolved.discountType).toBe('FIXED');
    expect(resolved.discountAmount.toFixed(2)).toBe('50.00');
  });

  it('rejects a cart below the minimum subtotal', () => {
    expect(() =>
      assertPromoApplicable({ ...base, minSubtotal: money('500.00') }, money('200.00')),
    ).toThrow('This promo requires a subtotal of at least 500.00.');
  });

  it('rejects an exhausted usage limit', () => {
    expect(() => assertPromoApplicable({ ...base, usageLimit: 1, usageCount: 1 }, money('1000.00'))).toThrow(
      'This promo code has reached its usage limit.',
    );
  });

  it('normalizes and generates codes', () => {
    expect(normalizePromoCode('  save 20 ')).toBe('SAVE20');
    expect(generatePromoCode('demo')).toMatch(/^DEMO-[A-Z0-9]{6}$/);
    expect(PROMO_DISCOUNT_TYPES).toContain('FIXED' satisfies PromoDiscountType);
    expect(PROMO_CODE_STATUSES).toContain('ACTIVE');
    expect(applyDiscount(money('100'), 'FIXED', money('10')).discountAmount.toFixed(2)).toBe('10.00');
  });
});
