import {
  lineGross,
  lineTotal,
  money,
  outstandingAmount,
  purchaseTotals,
  remainingQuantity,
  statusAfterReceipt,
} from './purchase-money';
import { PurchaseStatus } from '../prisma/client';

describe('purchase money', () => {
  it('computes line totals from negotiated unit cost, not selling price', () => {
    expect(lineGross(money('500.00'), 100).toFixed(2)).toBe('50000.00');
    expect(lineTotal(money('500.00'), 100, money('1000.00'), money('0')).toFixed(2)).toBe('49000.00');
  });

  it('rejects a discount greater than the line gross', () => {
    expect(() => lineTotal(money('10.00'), 2, money('21.00'), money('0'))).toThrow(
      'Item discount cannot exceed the line gross.',
    );
  });

  it('keeps header discount separate from item discounts when totaling', () => {
    const totals = purchaseTotals(
      [{ unitCost: money('100.00'), quantity: 10, discount: money('50.00'), tax: money('18.00') }],
      money('20.00'),
      money('0'),
    );
    expect(totals.subtotal.toFixed(2)).toBe('1000.00');
    expect(totals.discount.toFixed(2)).toBe('20.00');
    expect(totals.total.toFixed(2)).toBe('948.00');
  });

  it('computes remaining quantity and receipt status', () => {
    expect(remainingQuantity(100, 60)).toBe(40);
    expect(statusAfterReceipt(100, 0)).toBe(PurchaseStatus.ORDERED);
    expect(statusAfterReceipt(100, 60)).toBe(PurchaseStatus.PARTIALLY_RECEIVED);
    expect(statusAfterReceipt(100, 100)).toBe(PurchaseStatus.RECEIVED);
  });

  it('computes outstanding as purchase total minus paid', () => {
    expect(outstandingAmount(money('50000'), money('20000')).toFixed(2)).toBe('30000.00');
  });
});
