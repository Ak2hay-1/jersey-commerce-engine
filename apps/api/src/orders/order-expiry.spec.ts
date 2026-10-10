import { orderPaymentTtlMinutes } from './order-expiry.service';

describe('orderPaymentTtlMinutes', () => {
  it('defaults to 60 minutes', () => {
    expect(orderPaymentTtlMinutes({})).toBe(60);
  });

  it('uses a configured value of at least 15 minutes', () => {
    expect(orderPaymentTtlMinutes({ ORDER_PAYMENT_TTL_MINUTES: '30' })).toBe(30);
    expect(orderPaymentTtlMinutes({ ORDER_PAYMENT_TTL_MINUTES: '90.7' })).toBe(90);
  });

  it('ignores values that would expire orders while shoppers are still paying', () => {
    expect(orderPaymentTtlMinutes({ ORDER_PAYMENT_TTL_MINUTES: '5' })).toBe(60);
    expect(orderPaymentTtlMinutes({ ORDER_PAYMENT_TTL_MINUTES: 'abc' })).toBe(60);
  });
});
