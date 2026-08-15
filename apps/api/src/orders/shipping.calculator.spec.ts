import { Prisma } from '../prisma/client';
import { ShippingCalculator } from './shipping.calculator';

const d = (value: string) => new Prisma.Decimal(value);

describe('shipping calculator', () => {
  const calculator = new ShippingCalculator();

  it('does not charge shipping for store pickup', () => {
    const quote = calculator.quote('STORE_PICKUP', d('500.00'), {
      shippingCalculationMode: 'FIXED',
      shippingFixedAmount: d('80.00'),
      freeShippingMinSubtotal: null,
    });
    expect(quote.amount.toFixed(2)).toBe('0.00');
    expect(quote.mode).toBe('PICKUP');
  });

  it('uses the tenant fixed fee when configured', () => {
    const quote = calculator.quote('DELIVERY', d('500.00'), {
      shippingCalculationMode: 'FIXED',
      shippingFixedAmount: d('80.00'),
      freeShippingMinSubtotal: null,
    });
    expect(quote.amount.toFixed(2)).toBe('80.00');
  });

  it('applies a free-shipping threshold without hard-coding an amount', () => {
    const quote = calculator.quote('DELIVERY', d('1500.00'), {
      shippingCalculationMode: 'FIXED',
      shippingFixedAmount: d('80.00'),
      freeShippingMinSubtotal: d('1000.00'),
    });
    expect(quote.amount.toFixed(2)).toBe('0.00');
    expect(quote.mode).toBe('FREE_THRESHOLD');
  });
});
