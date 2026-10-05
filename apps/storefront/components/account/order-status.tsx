import type { OrderDetail, OrderStatus as OrderStatusValue, OrderTrackingStep } from '@jersey-commerce/types';
import { cn } from '@jersey-commerce/ui';
import { Check } from 'lucide-react';

const STATUS_TONE: Record<OrderStatusValue, string> = {
  PENDING: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  CONFIRMED: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
  PROCESSING: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
  READY: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
  SHIPPED: 'border-violet-400/30 bg-violet-400/10 text-violet-200',
  COMPLETED: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  CANCELLED: 'border-white/15 bg-white/5 text-muted-foreground',
  RETURNED: 'border-white/15 bg-white/5 text-muted-foreground',
  REFUNDED: 'border-white/15 bg-white/5 text-muted-foreground',
};

export function OrderStatusBadge({ status }: { status: OrderStatusValue }): React.JSX.Element {
  return (
    <span className={cn('badge border', STATUS_TONE[status] ?? STATUS_TONE.PENDING)}>{status.replaceAll('_', ' ')}</span>
  );
}

export function OrderStatus({ order }: { order: OrderDetail }): React.JSX.Element {
  return (
    <ol className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {order.tracking.map((step) => {
        const reached = step.done || step.current;
        return (
          <li
            key={step.key}
            className={cn(
              'flex items-center gap-3 rounded-[var(--radius)] border px-3 py-3 text-sm',
              step.current ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.08)]' : reached ? 'border-white/20' : 'border-white/[0.08] text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px]',
                step.done ? 'border-transparent bg-foreground text-background' : step.current ? 'border-[hsl(var(--accent))]' : 'border-white/20',
              )}
              aria-hidden
            >
              {step.done ? <Check className="h-3.5 w-3.5" /> : null}
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                {step.current ? 'Current' : step.done ? 'Done' : step.skipped ? 'Skipped' : 'Upcoming'}
              </span>
              <span className="block font-medium">{step.label}</span>
            </span>
          </li>
        );
      })}
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
