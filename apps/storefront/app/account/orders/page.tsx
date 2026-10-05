import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Package } from 'lucide-react';
import { storeApi } from '../../../lib/api';
import { serverStoreOptions } from '../../../lib/server-options';
import { formatMoney } from '../../../lib/format';
import { EmptyState } from '../../../components/ui/empty-state';
import { OrderStatusBadge } from '../../../components/account/order-status';

export const metadata: Metadata = { title: 'Orders' };

export default async function OrdersPage(): Promise<React.JSX.Element> {
  const options = await serverStoreOptions();
  if (!options.accessToken) {
    return <EmptyState title="Sign in to view orders" description="Order history is available after you sign in." actionHref="/auth/login" actionLabel="Sign in" />;
  }
  const result = await storeApi.orders(options);
  const store = await storeApi.bootstrap(options);
  if (result.items.length === 0) {
    return (
      <EmptyState
        icon={<Package className="h-7 w-7" />}
        title="No orders yet"
        description="When you place an order, it will appear here."
        actionHref="/products"
        actionLabel="Shop now"
      />
    );
  }
  return (
    <div className="space-y-6">
      <h1 className="font-display text-[clamp(2.25rem,5vw,3.5rem)]">Orders</h1>
      <ul className="space-y-3">
        {result.items.map((order) => (
          <li key={order.id}>
            <Link
              href={`/account/orders/${order.id}`}
              className="panel group flex flex-wrap items-center gap-x-6 gap-y-3 p-4 transition-colors hover:border-white/25 sm:p-5"
            >
              <div className="min-w-0 flex-1">
                <p className="font-heading text-xl uppercase tracking-wide">{order.orderNumber}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' · '}
                  {order.fulfillmentMethod === 'STORE_PICKUP' ? 'Store pickup' : 'Delivery'}
                </p>
              </div>
              <OrderStatusBadge status={order.status} />
              <p className="tabular font-heading text-xl font-bold">{formatMoney(order.total, store.tenant.currency)}</p>
              <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
