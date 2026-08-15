import { BadRequestException } from '@nestjs/common';
import { PaymentMethod, Prisma } from '../prisma/client';
import { PaymentProcessor } from './payment-processor.service';
import { PaymentProviderRegistry } from './providers/payment-provider.registry';

const registry = new PaymentProviderRegistry();
const processor = new PaymentProcessor(registry);
const total = () => new Prisma.Decimal('850.00');

describe('PaymentProcessor', () => {
  it('records cash tender and calculated change', () => {
    const payment = processor.prepareCaptures(total(), [
      { method: PaymentMethod.CASH, amountReceived: '1000.00' },
    ])[0];
    expect(payment).toBeDefined();
    expect(payment!.amount.toFixed(2)).toBe('850.00');
    expect(payment!.amountReceived?.toFixed(2)).toBe('1000.00');
    expect(payment!.changeDue?.toFixed(2)).toBe('150.00');
    expect(payment!.status).toBe('COMPLETED');
  });

  it('rejects cash when amount received is too low', () => {
    expect(() =>
      processor.prepareCaptures(total(), [{ method: PaymentMethod.CASH, amountReceived: '800.00' }]),
    ).toThrow(BadRequestException);
  });

  it('records a cashier-confirmed UPI payment without claiming a gateway', () => {
    const [payment] = processor.prepareCaptures(total(), [
      { method: PaymentMethod.UPI, confirmed: true, reference: 'UPI123456' },
    ]);
    expect(payment).toBeDefined();
    expect(payment?.status).toBe('COMPLETED');
    expect((payment?.metadata as { gatewayConfirmed: boolean }).gatewayConfirmed).toBe(false);
  });

  it('rejects unconfirmed UPI capture', () => {
    expect(() =>
      processor.prepareCaptures(total(), [{ method: PaymentMethod.UPI, reference: 'UPI123456' }]),
    ).toThrow(/explicitly confirmed/);
  });

  it('records card payments without storing sensitive fields', () => {
    const payment = processor.prepareCaptures(total(), [
      {
        method: PaymentMethod.CARD,
        confirmed: true,
        reference: 'AUTH99',
        metadata: { cvv: '123', last4: '4242' },
      },
    ])[0];
    expect(payment).toBeDefined();
    expect(payment?.provider).toBe('MANUAL_CARD_TERMINAL');
    expect(payment?.metadata).not.toHaveProperty('cvv');
    expect((payment?.metadata as { last4?: string }).last4).toBe('4242');
  });

  it('supports split payments that equal the sale total', () => {
    const payments = processor.prepareCaptures(new Prisma.Decimal('2000.00'), [
      { method: PaymentMethod.CASH, amount: '500.00', amountReceived: '500.00' },
      { method: PaymentMethod.UPI, amount: '1500.00', confirmed: true, reference: 'SPLIT-UPI' },
    ]);
    expect(payments).toHaveLength(2);
    expect(payments[0]?.amount.toFixed(2)).toBe('500.00');
    expect(payments[1]?.amount.toFixed(2)).toBe('1500.00');
  });

  it('rejects incomplete split payments', () => {
    expect(() =>
      processor.prepareCaptures(new Prisma.Decimal('2000.00'), [
        { method: PaymentMethod.CASH, amount: '500.00', amountReceived: '500.00' },
      ]),
    ).toThrow(/equal the sale total/);
  });

  it('rejects duplicate references in the same capture set', () => {
    expect(() =>
      processor.prepareCaptures(new Prisma.Decimal('200.00'), [
        { method: PaymentMethod.UPI, amount: '100.00', confirmed: true, reference: 'DUP' },
        { method: PaymentMethod.UPI, amount: '100.00', confirmed: true, reference: 'DUP' },
      ]),
    ).toThrow(/Duplicate payment references/);
  });

  it('never fakes an online gateway capture', () => {
    expect(() =>
      processor.prepareCaptures(total(), [{ method: PaymentMethod.ONLINE, confirmed: true, reference: 'GW' }]),
    ).toThrow(/not configured/);
  });
});
