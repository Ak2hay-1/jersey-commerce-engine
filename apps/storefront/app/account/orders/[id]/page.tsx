import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { storeApi } from '../../../../lib/api';
import { serverStoreOptions } from '../../../../lib/server-options';
import { StoreApiError } from '../../../../lib/errors';
import { formatMoney } from '../../../../lib/format';
import { nextStepCopy, OrderStatus } from '../../../../components/account/order-status';

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
      <p className="text-sm text-muted-foreground">{nextStepCopy(order)}</p>
      <OrderStatus order={order} />
      <ul className="divide-y border-y">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-3 py-3 text-sm">
            <span className="min-w-0 break-words">
              {item.productName} × {item.quantity}
            </span>
            <span className="shrink-0">{formatMoney(item.total, store.tenant.currency)}</span>
          </li>
        ))}
      </ul>
      <p className="font-heading text-2xl uppercase">Total {formatMoney(order.total, store.tenant.currency)}</p>
    </div>
  );
}
