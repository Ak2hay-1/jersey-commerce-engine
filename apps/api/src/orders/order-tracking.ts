import type { FulfillmentMethod, OrderStatus, OrderTrackingStepKey } from '@jersey-commerce/types';
import type { OrderTrackingStep } from '@jersey-commerce/types';

const STEP_LABELS: Record<OrderTrackingStepKey, string> = {
  PLACED: 'Order placed',
  PAYMENT_CONFIRMED: 'Payment confirmed',
  PROCESSING: 'Processing',
  READY: 'Ready',
  SHIPPED: 'Shipped',
  COMPLETED: 'Completed',
};

const STATUS_RANK: Record<OrderStatus, number> = {
  PENDING: 1,
  CONFIRMED: 2,
  PROCESSING: 3,
  READY: 4,
  SHIPPED: 5,
  COMPLETED: 6,
  CANCELLED: 0,
  RETURNED: 0,
  REFUNDED: 0,
};

export function buildOrderTracking(input: {
  status: OrderStatus;
  paymentCompleted: boolean;
  fulfillmentMethod: FulfillmentMethod;
}): OrderTrackingStep[] {
  const rank = STATUS_RANK[input.status] ?? 0;
  const skipShipped = input.fulfillmentMethod === 'STORE_PICKUP';
  const keys: OrderTrackingStepKey[] = ['PLACED', 'PAYMENT_CONFIRMED', 'PROCESSING', 'READY', 'SHIPPED', 'COMPLETED'];
  return keys.map((key) => {
    const skipped = key === 'SHIPPED' && skipShipped;
    let done = false;
    if (key === 'PLACED') {
      done = rank >= 1 || input.status === 'CANCELLED';
    } else if (key === 'PAYMENT_CONFIRMED') {
      done = input.paymentCompleted;
    } else if (key === 'PROCESSING') {
      done = rank >= 3;
    } else if (key === 'READY') {
      done = rank >= 4;
    } else if (key === 'SHIPPED') {
      done = !skipped && rank >= 5;
    } else if (key === 'COMPLETED') {
      done = rank >= 6;
    }
    const current =
      !skipped &&
      !done &&
      ((key === 'PAYMENT_CONFIRMED' && rank >= 1 && !input.paymentCompleted) ||
        (key === 'PROCESSING' && rank === 2 && input.paymentCompleted) ||
        (key === 'READY' && rank === 3) ||
        (key === 'SHIPPED' && rank === 4 && !skipShipped) ||
        (key === 'COMPLETED' && (rank === 5 || (rank === 4 && skipShipped))));
    return { key, label: STEP_LABELS[key], done, current, skipped };
  });
}
