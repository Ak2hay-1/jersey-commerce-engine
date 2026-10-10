import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@jersey-commerce/ui';
import { storeApi } from '../../../../lib/api';
import { serverStoreOptions } from '../../../../lib/server-options';
import { StoreApiError } from '../../../../lib/errors';
import type { OrderDetail } from '@jersey-commerce/types';
import { OrderDetailsPanel } from '../../../../components/account/order-details';
import { RetryPayment } from '../../../../components/checkout/retry-payment';
import { canRetryPayment } from '../../../../lib/payment-state';

type Params = { orderNumber: string };

function orderStatusMessage(order: OrderDetail): { tone: 'ok' | 'pending' | 'cancelled'; title: string; body: string } {
  if (order.status === 'CANCELLED') {
    return {
      tone: 'cancelled',
      title: 'Order cancelled',
      body: order.cancelReason ?? 'This order was cancelled. Any payment taken is refunded to the original method.',
    };
  }
  const isCod = order.payments.some((payment) => payment.method === 'COD');
  if (order.paymentStatus === 'COMPLETED') {
    return {
      tone: 'ok',
      title: 'Payment received',
      body: 'Your order is confirmed. We will share dispatch details shortly — keep the order number handy.',
    };
  }
  if (isCod) {
    return {
      tone: 'ok',
      title: 'Order placed — pay on delivery',
      body: 'Keep the exact amount ready for the courier. We will share dispatch details shortly.',
    };
  }
  return {
    tone: 'pending',
    title: 'Payment pending',
    body: 'We have reserved your items, but payment has not been received yet. Complete payment to confirm the order — unpaid orders are released automatically after a while.',
  };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { orderNumber } = await params;
  return { title: `Order ${orderNumber}` };
}

export default async function OrderSuccessPage({ params }: { params: Promise<Params> }): Promise<React.JSX.Element> {
  const { orderNumber } = await params;
  const options = await serverStoreOptions();
  let order;
  try {
    order = await storeApi.order(orderNumber, options);
  } catch (error) {
    if (error instanceof StoreApiError && (error.status === 404 || error.status === 401)) {
      if (!options.accessToken && !options.orderAccessToken) {
        return (
          <div className="mx-auto max-w-lg store-gutter py-12 text-center md:py-16">
            <h1 className="break-words font-heading text-3xl uppercase tracking-wide md:text-4xl">Order placed</h1>
            <p className="mt-3 text-muted-foreground">
              Your order number is <strong>{orderNumber}</strong>. Open this page on the device you ordered from, or sign
              in to view full details and payment status.
            </p>
            <Button asChild className="mt-6">
              <Link href={`/auth/login?next=${encodeURIComponent(`/order/success/${orderNumber}`)}`}>Sign in</Link>
            </Button>
          </div>
        );
      }
      notFound();
    }
    throw error;
  }
  const store = await storeApi.bootstrap(options);
  const status = orderStatusMessage(order);

  return (
    <div className="mx-auto max-w-3xl space-y-6 store-gutter py-10 md:py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {status.tone === 'pending' ? 'Almost there' : 'Thank you'}
      </p>
      <h1 className="break-words font-heading text-3xl uppercase tracking-wide md:text-4xl">Order {order.orderNumber}</h1>
      <div
        className={
          status.tone === 'pending'
            ? 'border border-amber-400/40 bg-amber-400/10 px-4 py-4 text-sm'
            : status.tone === 'cancelled'
              ? 'border border-red-400/40 bg-red-400/10 px-4 py-4 text-sm'
              : 'border border-foreground/15 bg-muted/40 px-4 py-4 text-sm'
        }
        role="status"
      >
        <p className="font-semibold uppercase tracking-[0.14em]">{status.title}</p>
        <p className="mt-2 text-muted-foreground">{status.body}</p>
        {canRetryPayment(order) ? (
          <div className="mt-4">
            <RetryPayment order={order} />
          </div>
        ) : null}
      </div>
      <OrderDetailsPanel order={order} currency={store.tenant.currency} />
      <div className="flex flex-wrap gap-3">
        {options.accessToken ? (
          <Button asChild>
            <Link href={`/account/orders/${order.id}`}>View in my account</Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}
