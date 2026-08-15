import { buildOrderTracking } from './order-tracking';

describe('order tracking', () => {
  it('marks completed steps and leaves later steps open', () => {
    const steps = buildOrderTracking({
      status: 'READY',
      paymentCompleted: true,
      fulfillmentMethod: 'DELIVERY',
    });
    const byKey = Object.fromEntries(steps.map((step) => [step.key, step]));
    expect(byKey.PLACED?.done).toBe(true);
    expect(byKey.PAYMENT_CONFIRMED?.done).toBe(true);
    expect(byKey.PROCESSING?.done).toBe(true);
    expect(byKey.READY?.done).toBe(true);
    expect(byKey.SHIPPED?.done).toBe(false);
    expect(byKey.COMPLETED?.done).toBe(false);
    expect(byKey.SHIPPED?.current).toBe(true);
  });

  it('skips shipped for store pickup', () => {
    const steps = buildOrderTracking({
      status: 'READY',
      paymentCompleted: true,
      fulfillmentMethod: 'STORE_PICKUP',
    });
    const shipped = steps.find((step) => step.key === 'SHIPPED');
    expect(shipped?.skipped).toBe(true);
    expect(shipped?.done).toBe(false);
    expect(steps.find((step) => step.key === 'COMPLETED')?.current).toBe(true);
  });
});
