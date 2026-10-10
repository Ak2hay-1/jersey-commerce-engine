import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Package } from 'lucide-react';
import { storeApi } from '../../../lib/api';
import { serverStoreOptions } from '../../../lib/server-options';
import { formatMoney } from '../../../lib/format';
import { EmptyState } from '../../../components/ui/empty-state';
import { OrderStatusBadge } from '../../../components/account/order-status';
import { loginHref } from '../../../lib/next-path';

export const metadata: Metadata = { title: 'Orders' };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}): Promise<React.JSX.Element> {
  const options = await serverStoreOptions();
  if (!options.accessToken) {
    return (
      <EmptyState
        title="Sign in to view orders"
        description="Order history is available after you sign in."
        actionHref={loginHref('/account/orders')}
        actionLabel="Sign in"
      />
    );
  }
  const requested = Number.parseInt((await searchParams).page ?? '1', 10);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;
  const result = await storeApi.orders(options, page);
  const store = await storeApi.bootstrap(options);
  const totalPages = result.meta?.totalPages ?? 1;
  if (result.items.length === 0 && page === 1) {
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
      {totalPages > 1 ? (
        <nav className="flex items-center justify-between gap-3 text-sm" aria-label="Order pages">
          {page > 1 ? (
            <Link className="btn btn-secondary" href={`/account/orders?page=${page - 1}`}>
              Newer orders
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            Page {Math.min(page, totalPages)} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link className="btn btn-secondary" href={`/account/orders?page=${page + 1}`}>
              Older orders
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
