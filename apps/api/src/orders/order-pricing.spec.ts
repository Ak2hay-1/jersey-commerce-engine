import { Prisma } from '../prisma/client';
import { priceOrderLines } from './order-pricing';

const d = (value: string) => new Prisma.Decimal(value);

describe('order pricing', () => {
  it('uses server-side unit prices and preserves tax on each line', () => {
    const result = priceOrderLines(
      [
        {
          productVariantId: 'v1',
          productName: 'India Jersey',
          sku: 'IND-M',
          size: 'M',
          color: 'Blue',
          quantity: 2,
          unitPrice: d('1000.00'),
          costPrice: d('400.00'),
          taxRate: d('10'),
          taxInclusive: true,
        },
      ],
      'NONE',
      d('0'),
      d('50.00'),
    );
    expect(result.subtotal.toFixed(2)).toBe('2000.00');
    expect(result.shippingAmount.toFixed(2)).toBe('50.00');
    expect(result.total.toFixed(2)).toBe('2050.00');
    expect(result.lines[0]?.tax.toFixed(2)).toBe('181.82');
    expect(result.lines[0]?.total.toFixed(2)).toBe('2000.00');
  });

  it('validates a percentage discount on the backend', () => {
    const result = priceOrderLines(
      [
        {
          productVariantId: 'v1',
          productName: 'India Jersey',
          sku: 'IND-M',
          size: 'M',
          color: null,
          quantity: 1,
          unitPrice: d('1000.00'),
          costPrice: d('400.00'),
          taxRate: d('0'),
          taxInclusive: true,
        },
      ],
      'PERCENTAGE',
      d('10'),
      d('0'),
    );
    expect(result.discount.toFixed(2)).toBe('100.00');
    expect(result.total.toFixed(2)).toBe('900.00');
  });

  it('rejects a discount larger than the merchandise total', () => {
    expect(() =>
      priceOrderLines(
        [
          {
            productVariantId: 'v1',
            productName: 'India Jersey',
            sku: 'IND-M',
            size: null,
            color: null,
            quantity: 1,
            unitPrice: d('100.00'),
            costPrice: d('40.00'),
            taxRate: d('0'),
            taxInclusive: true,
          },
        ],
        'FIXED',
        d('150.00'),
        d('0'),
      ),
    ).toThrow('Discount cannot exceed the applicable amount.');
  });
});
