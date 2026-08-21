import type { OrderDetail, OrderTrackingStep } from '@jersey-commerce/types';
import { cn } from '@jersey-commerce/ui';

export function OrderStatus({ order }: { order: OrderDetail }): React.JSX.Element {
  return (
    <ol className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {order.tracking.map((step) => (
        <li key={step.key} className={cn('border px-3 py-2 text-sm', step.done || step.current ? 'border-foreground' : 'border-border text-muted-foreground')}>
          <p className="text-[10px] uppercase tracking-wider">{step.current ? 'Current' : step.done ? 'Done' : step.skipped ? 'Skipped' : 'Upcoming'}</p>
          <p className="font-medium">{step.label}</p>
        </li>
      ))}
    </ol>
  );
}

export function nextStepCopy(order: OrderDetail): string {
  const current: OrderTrackingStep | undefined = order.tracking.find((step) => step.current);
  if (order.status === 'CANCELLED') {
    return 'This order was cancelled.';
  }
  if (order.paymentState === 'PAYMENT_PENDING') {
    return 'Payment is pending. The store will confirm once it is received.';
  }
  return current ? `Next: ${current.label}.` : 'We will update this order as it moves through the store.';
}
