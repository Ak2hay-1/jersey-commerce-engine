import type { OrderDetail } from '@jersey-commerce/types';

/** An unpaid storefront order whose Razorpay order can still be paid. */
export function canRetryPayment(order: OrderDetail): boolean {
  const intent = order.paymentIntent;
  return (
    order.status === 'PENDING' &&
    order.paymentStatus === 'PENDING' &&
    intent?.nextAction === 'AWAIT_GATEWAY' &&
    Boolean(intent.razorpayOrderId) &&
    Boolean(intent.amountPaise)
  );
}
