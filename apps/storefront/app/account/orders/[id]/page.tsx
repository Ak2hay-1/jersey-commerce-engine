import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { storeApi } from '../../../../lib/api';
import { serverStoreOptions } from '../../../../lib/server-options';
import { StoreApiError } from '../../../../lib/errors';
import { OrderDetailsPanel } from '../../../../components/account/order-details';
import { RetryPayment } from '../../../../components/checkout/retry-payment';
import { canRetryPayment } from '../../../../lib/payment-state';

type Params = { id: string };

export const metadata: Metadata = { title: 'Order' };

export default async function AccountOrderPage({ params }: { params: Promise<Params> }): Promise<React.JSX.Element> {
  const { id } = await params;
  const options = await serverStoreOptions();
  let order;
  try {
    order = await storeApi.order(id, options);
  } catch (error) {
    if (error instanceof StoreApiError && (error.status === 404 || error.status === 401)) {
      notFound();
    }
    throw error;
  }
  const store = await storeApi.bootstrap(options);
  return (
    <div className="space-y-6">
      <h1 className="font-display break-words text-[clamp(2rem,5vw,3.25rem)]">Order {order.orderNumber}</h1>
      {canRetryPayment(order) ? (
        <div className="space-y-3 border border-amber-400/40 bg-amber-400/10 px-4 py-4 text-sm" role="status">
          <p className="font-semibold uppercase tracking-[0.14em]">Payment pending</p>
          <p className="text-muted-foreground">Complete payment to confirm this order before the reservation expires.</p>
          <RetryPayment order={order} />
        </div>
      ) : null}
      <OrderDetailsPanel order={order} currency={store.tenant.currency} />
    </div>
  );
}
