'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard } from 'lucide-react';
import type { OrderDetail } from '@jersey-commerce/types';
import { payWithRazorpay, PaymentDismissedError } from '../../lib/razorpay-pay';
import { publicErrorMessage } from '../../lib/errors';
import { canRetryPayment } from '../../lib/payment-state';
import { useStore } from '../providers/store-provider';
import { Alert } from '../ui/alert';

export function RetryPayment({ order }: { order: OrderDetail }): React.JSX.Element | null {
  const router = useRouter();
  const store = useStore();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intent = order.paymentIntent;
  const keyId = intent?.razorpayKeyId || store.payments?.razorpayKeyId;
  if (!canRetryPayment(order) || !intent?.razorpayOrderId || !intent.amountPaise || !keyId) {
    return null;
  }

  async function pay(): Promise<void> {
    if (!intent?.razorpayOrderId || !intent.amountPaise || !keyId) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await payWithRazorpay({
        keyId,
        razorpayOrderId: intent.razorpayOrderId,
        amountPaise: intent.amountPaise,
        currency: order.currency || 'INR',
        storeName: store.tenant.name,
        orderNumber: order.orderNumber,
        themeColor: store.theme.primaryColor,
        prefill: {
          name: order.customer?.name ?? undefined,
          email: order.customer?.email ?? undefined,
          contact: order.customer?.phone ?? undefined,
        },
      });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof PaymentDismissedError ? caught.message : publicErrorMessage(caught, 'Payment could not be completed.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <button type="button" className="btn btn-lg btn-primary cursor-pointer" disabled={pending} onClick={() => void pay()}>
        <CreditCard className="h-4 w-4" aria-hidden />
        {pending ? 'Opening payment…' : 'Complete payment'}
      </button>
    </div>
  );
}
