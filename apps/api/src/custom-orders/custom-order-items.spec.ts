import { deriveOrderingMode, normalizeCustomOrderItems, totalItemQuantity } from './custom-order-items';

describe('custom order items', () => {
  it('sums player-list quantities', () => {
    const items = normalizeCustomOrderItems([
      { lineType: 'PLAYER_LIST', playerName: 'Rahul', jerseyNumber: '10', size: 'M', quantity: 1, unitPrice: '800' },
      { lineType: 'PLAYER_LIST', playerName: 'Amit', jerseyNumber: '7', size: 'L', quantity: 1, unitPrice: '800' },
      { lineType: 'PLAYER_LIST', playerName: 'Akshay', jerseyNumber: '18', size: 'XL', quantity: 1, unitPrice: '800' },
    ]);
    expect(totalItemQuantity(items)).toBe(3);
    expect(deriveOrderingMode(items)).toBe('PLAYER_LIST');
  });

  it('sums size-wise bulk quantities', () => {
    const items = normalizeCustomOrderItems([
      { lineType: 'SIZE_QUANTITY', size: 'S', quantity: 5, unitPrice: '700' },
      { lineType: 'SIZE_QUANTITY', size: 'M', quantity: 12, unitPrice: '700' },
      { lineType: 'SIZE_QUANTITY', size: 'L', quantity: 18, unitPrice: '700' },
      { lineType: 'SIZE_QUANTITY', size: 'XL', quantity: 10, unitPrice: '700' },
      { lineType: 'SIZE_QUANTITY', size: 'XXL', quantity: 3, unitPrice: '700' },
    ]);
    expect(totalItemQuantity(items)).toBe(48);
    expect(deriveOrderingMode(items)).toBe('SIZE_QUANTITY');
  });

  it('requires player names and sizes for the matching line types', () => {
    expect(() => normalizeCustomOrderItems([{ lineType: 'PLAYER_LIST', quantity: 1 }])).toThrow('playerName');
    expect(() => normalizeCustomOrderItems([{ lineType: 'SIZE_QUANTITY', quantity: 5 }])).toThrow('size');
  });
});
