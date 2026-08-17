import { assertOrderTransition, canTransitionOrderStatus, isCancellableStatus } from './order-state-machine';

describe('order state machine', () => {
  it('allows the recommended fulfillment path', () => {
    expect(canTransitionOrderStatus('PENDING', 'CONFIRMED')).toBe(true);
    expect(canTransitionOrderStatus('CONFIRMED', 'PROCESSING')).toBe(true);
    expect(canTransitionOrderStatus('PROCESSING', 'READY')).toBe(true);
    expect(canTransitionOrderStatus('READY', 'SHIPPED')).toBe(true);
    expect(canTransitionOrderStatus('SHIPPED', 'COMPLETED')).toBe(true);
  });

  it('rejects skipped or reversed transitions', () => {
    expect(canTransitionOrderStatus('COMPLETED', 'PROCESSING')).toBe(false);
    expect(canTransitionOrderStatus('CANCELLED', 'CONFIRMED')).toBe(false);
    expect(canTransitionOrderStatus('PENDING', 'SHIPPED')).toBe(false);
  });

  it('allows pickup completion from READY and rejects shipping pickup orders', () => {
    expect(() => assertOrderTransition('READY', 'COMPLETED', 'STORE_PICKUP')).not.toThrow();
    expect(() => assertOrderTransition('READY', 'SHIPPED', 'STORE_PICKUP')).toThrow(
      'Store pickup orders are collected at READY, not shipped.',
    );
    expect(() => assertOrderTransition('READY', 'COMPLETED', 'DELIVERY')).toThrow(
      'Delivery orders must be shipped before they can be completed.',
    );
  });

  it('treats early statuses as cancellable', () => {
    expect(isCancellableStatus('PENDING')).toBe(true);
    expect(isCancellableStatus('READY')).toBe(true);
    expect(isCancellableStatus('SHIPPED')).toBe(false);
    expect(isCancellableStatus('COMPLETED')).toBe(false);
  });
});
