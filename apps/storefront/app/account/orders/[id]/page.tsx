import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { storeApi } from '../../../../lib/api';
import { serverStoreOptions } from '../../../../lib/server-options';
import { StoreApiError } from '../../../../lib/errors';
import { OrderDetailsPanel } from '../../../../components/account/order-details';

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
      <h1 className="break-words font-heading text-3xl uppercase tracking-wide md:text-4xl">Order {order.orderNumber}</h1>
      <OrderDetailsPanel order={order} currency={store.tenant.currency} />
    </div>
  );
}
