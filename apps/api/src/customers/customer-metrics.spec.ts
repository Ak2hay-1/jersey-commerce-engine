import { computePurchaseMetrics, netPurchaseAmount } from './customer-metrics';

describe('customer-metrics', () => {
  it('computes total spent, order count, average, items, and first/last purchase', () => {
    const metrics = computePurchaseMetrics([
      { total: 1799, itemQuantity: 1, createdAt: new Date('2026-01-10T10:00:00Z') },
      { total: 999, itemQuantity: 2, createdAt: new Date('2026-08-12T10:00:00Z') },
      { total: 1556, itemQuantity: 1, createdAt: new Date('2026-03-01T10:00:00Z') },
    ]);
    expect(metrics.totalOrders).toBe(3);
    expect(metrics.totalSpent).toBe('4354.00');
    expect(metrics.averageOrder).toBe('1451.33');
    expect(metrics.totalItemsPurchased).toBe(4);
    expect(metrics.firstPurchaseAt).toBe('2026-01-10T10:00:00.000Z');
    expect(metrics.lastPurchaseAt).toBe('2026-08-12T10:00:00.000Z');
  });

  it('returns zeros when there are no counted purchases', () => {
    const metrics = computePurchaseMetrics([]);
    expect(metrics.totalOrders).toBe(0);
    expect(metrics.totalSpent).toBe('0.00');
    expect(metrics.averageOrder).toBe('0.00');
    expect(metrics.totalItemsPurchased).toBe(0);
    expect(metrics.firstPurchaseAt).toBeNull();
    expect(metrics.lastPurchaseAt).toBeNull();
  });

  it('nets refunds without going negative', () => {
    expect(netPurchaseAmount(2000, 500)).toBe(1500);
    expect(netPurchaseAmount(2000, 2500)).toBe(0);
  });
});
