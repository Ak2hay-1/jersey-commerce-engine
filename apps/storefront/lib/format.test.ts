import { describe, expect, it } from 'vitest';
import { availabilityLabel, discountPercent, formatMoney } from './format';

describe('storefront formatting', () => {
  it('formats INR without trusting a frontend total', () => {
    expect(formatMoney('2499.00', 'INR')).toContain('2,499');
  });

  it('computes discount only when compare-at is higher', () => {
    expect(discountPercent('2499.00', '2999.00')).toBe(17);
    expect(discountPercent('2499.00', '1999.00')).toBeNull();
  });

  it('does not invent scarcity copy for healthy stock', () => {
    expect(availabilityLabel('IN_STOCK', null)).toBe('In stock');
    expect(availabilityLabel('LOW_STOCK', 3)).toBe('Only 3 left');
    expect(availabilityLabel('OUT_OF_STOCK', null)).toBe('Out of stock');
  });
});
