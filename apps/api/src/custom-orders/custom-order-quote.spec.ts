import { Prisma } from '../prisma/client';
import { computeQuoteTotals, computeCustomizationCharge, derivePaymentState } from './custom-order-quote';

describe('custom order quotation', () => {
  it('computes merchandise, customization, discount, tax, shipping, and deposit', () => {
    const quote = computeQuoteTotals({
      unitPrice: '800.00',
      quantity: 48,
      customizationCharges: '9600.00',
      discount: '2000.00',
      tax: '0.00',
      shippingAmount: '500.00',
      depositRequired: '20000.00',
    });
    expect(quote.subtotal.toFixed(2)).toBe('48000.00');
    expect(quote.total.toFixed(2)).toBe('46500.00');
    expect(quote.depositRequired.toFixed(2)).toBe('20000.00');
  });

  it('rejects a deposit larger than the total', () => {
    expect(() =>
      computeQuoteTotals({ unitPrice: '100.00', quantity: 1, depositRequired: '200.00' }),
    ).toThrow('Deposit cannot exceed the quote total.');
  });

  it('prices customization as fixed, per item, or percentage', () => {
    expect(computeCustomizationCharge({ pricingType: 'FIXED', price: new Prisma.Decimal('2500'), quantity: 10, baseAmount: new Prisma.Decimal('8000') }).toFixed(2)).toBe('2500.00');
    expect(computeCustomizationCharge({ pricingType: 'PER_ITEM', price: new Prisma.Decimal('150'), quantity: 10, baseAmount: new Prisma.Decimal('8000') }).toFixed(2)).toBe('1500.00');
    expect(computeCustomizationCharge({ pricingType: 'PERCENTAGE', price: new Prisma.Decimal('10'), quantity: 10, baseAmount: new Prisma.Decimal('8000') }).toFixed(2)).toBe('800.00');
  });

  it('does not mark an order paid when only the deposit is received', () => {
    expect(
      derivePaymentState({
        total: new Prisma.Decimal('50000'),
        paid: new Prisma.Decimal('20000'),
        depositRequired: new Prisma.Decimal('20000'),
        depositPaid: new Prisma.Decimal('20000'),
      }),
    ).toBe('DEPOSIT_RECEIVED');
    expect(
      derivePaymentState({
        total: new Prisma.Decimal('50000'),
        paid: new Prisma.Decimal('50000'),
        depositRequired: new Prisma.Decimal('20000'),
        depositPaid: new Prisma.Decimal('20000'),
      }),
    ).toBe('PAID');
    expect(
      derivePaymentState({
        total: new Prisma.Decimal('50000'),
        paid: new Prisma.Decimal('5000'),
        depositRequired: new Prisma.Decimal('20000'),
        depositPaid: new Prisma.Decimal('5000'),
      }),
    ).toBe('PARTIALLY_PAID');
  });
});
