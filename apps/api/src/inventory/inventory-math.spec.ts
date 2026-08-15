import { availableQuantity, assertInventoryInvariants, stockStatus } from './inventory-math';

describe('inventory availability', () => {
  it('treats reserved quantity as unavailable', () => {
    expect(availableQuantity(40, 2)).toBe(38);
    expect(availableQuantity(1, 1)).toBe(0);
    expect(availableQuantity(0, 0)).toBe(0);
  });

  it('rejects reserved quantity that exceeds on-hand stock', () => {
    expect(() => assertInventoryInvariants(1, 5)).toThrow('Reserved quantity cannot exceed total quantity.');
  });

  it('rejects negative on-hand quantity', () => {
    expect(() => assertInventoryInvariants(-1, 0)).toThrow('Stock quantity cannot be negative.');
  });
});

describe('stock status', () => {
  it('marks quantity 0 as out of stock', () => {
    expect(stockStatus(0, 10)).toBe('OUT_OF_STOCK');
  });

  it('uses the per-variant reorder level for low stock', () => {
    expect(stockStatus(8, 10)).toBe('LOW_STOCK');
    expect(stockStatus(8, 0)).toBe('IN_STOCK');
    expect(stockStatus(11, 10)).toBe('IN_STOCK');
  });
});