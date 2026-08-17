import { describe, expect, it } from 'vitest';
import type { CheckoutIssue } from '@jersey-commerce/types';
import { blockingCheckoutIssues, canPlaceOrder } from './checkout';

function issue(code: CheckoutIssue['code'], message: string): CheckoutIssue {
  return { code, message };
}

describe('checkout validation', () => {
  it('blocks checkout when stock is insufficient or items are unavailable', () => {
    const issues = [
      issue('INSUFFICIENT_STOCK', 'Only 1 left for Home Kit M'),
      issue('PRICE_CHANGED', 'Price updated'),
    ];
    expect(canPlaceOrder(issues)).toBe(false);
    expect(blockingCheckoutIssues(issues).map((item) => item.code)).toEqual(['INSUFFICIENT_STOCK']);
  });

  it('warns on price changes without blocking a valid cart', () => {
    expect(canPlaceOrder([issue('PRICE_CHANGED', 'Home Kit is now 2599.00')])).toBe(true);
  });

  it('blocks expired or empty carts', () => {
    expect(canPlaceOrder([issue('CART_EXPIRED', 'Cart expired')])).toBe(false);
    expect(canPlaceOrder([issue('CART_EMPTY', 'Cart is empty')])).toBe(false);
    expect(canPlaceOrder([issue('ITEM_UNAVAILABLE', 'Variant archived')])).toBe(false);
  });
});
