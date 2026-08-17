import type { Metadata } from 'next';
import Link from 'next/link';
import { storeApi } from '../../../lib/api';
import { serverStoreOptions } from '../../../lib/server-options';
import { formatMoney } from '../../../lib/format';
import { EmptyState } from '../../../components/ui/empty-state';

export const metadata: Metadata = { title: 'Orders' };

export default async function OrdersPage(): Promise<React.JSX.Element> {
  const options = await serverStoreOptions();
  if (!options.accessToken) {
    return <EmptyState title="Sign in to view orders" description="Order history is available after you sign in." actionHref="/auth/login" actionLabel="Sign in" />;
  }
  const result = await storeApi.orders(options);
  const store = await storeApi.bootstrap(options);
  if (result.items.length === 0) {
    return <EmptyState title="No orders yet" description="When you place an order, it will appear here." actionHref="/products" actionLabel="Shop now" />;
  }
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-4xl uppercase tracking-wide">Orders</h1>
      <ul className="divide-y border-y">
        {result.items.map((order) => (
          <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <Link href={`/account/orders/${order.id}`} className="font-heading text-xl uppercase">
                {order.orderNumber}
              </Link>
              <p className="text-sm text-muted-foreground">{order.status.replaceAll('_', ' ')}</p>
            </div>
            <p>{formatMoney(order.total, store.tenant.currency)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
