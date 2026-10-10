import { describe, expect, it } from 'vitest';
import type { OrderDetail } from '@jersey-commerce/types';
import { canRetryPayment } from './payment-state';

function order(overrides: Partial<OrderDetail>): OrderDetail {
  return {
    status: 'PENDING',
    paymentStatus: 'PENDING',
    paymentIntent: { nextAction: 'AWAIT_GATEWAY', razorpayOrderId: 'order_1', amountPaise: 149900 },
    ...overrides,
  } as OrderDetail;
}

describe('canRetryPayment', () => {
  it('allows paying an unpaid online order', () => {
    expect(canRetryPayment(order({}))).toBe(true);
  });

  it('blocks paid, cancelled, and gateway-less orders', () => {
    expect(canRetryPayment(order({ paymentStatus: 'COMPLETED' }))).toBe(false);
    expect(canRetryPayment(order({ status: 'CANCELLED' }))).toBe(false);
    expect(canRetryPayment(order({ paymentIntent: undefined }))).toBe(false);
    expect(
      canRetryPayment(
        order({
          paymentIntent: { nextAction: 'AWAIT_GATEWAY', razorpayOrderId: null, amountPaise: 100 },
        } as unknown as Partial<OrderDetail>),
      ),
    ).toBe(false);
  });
});
