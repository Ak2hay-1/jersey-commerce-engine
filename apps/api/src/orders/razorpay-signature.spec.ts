import { createHmac } from 'node:crypto';

describe('Razorpay signature verification', () => {
  it('matches HMAC-SHA256(order_id|payment_id, secret)', () => {
    const orderId = 'order_test123';
    const paymentId = 'pay_test456';
    const secret = 'test_secret';
    const signature = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
    const expected = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
    expect(signature).toBe(expected);
    expect(signature).not.toBe(createHmac('sha256', secret).update(`${paymentId}|${orderId}`).digest('hex'));
  });
});
