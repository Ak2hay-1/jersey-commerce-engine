import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@jersey-commerce/ui';
import { storeApi } from '../../../../lib/api';
import { serverStoreOptions } from '../../../../lib/server-options';
import { StoreApiError } from '../../../../lib/errors';
import { OrderDetailsPanel } from '../../../../components/account/order-details';

type Params = { orderNumber: string };

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
              Your order number is <strong>{orderNumber}</strong>. Sign in to view full details and payment status.
            </p>
            <Button asChild className="mt-6">
              <Link href="/auth/login">View order</Link>
            </Button>
          </div>
        );
      }
      notFound();
    }
    throw error;
  }
  const store = await storeApi.bootstrap(options);

  return (
    <div className="mx-auto max-w-3xl space-y-6 store-gutter py-10 md:py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Thank you</p>
      <h1 className="break-words font-heading text-3xl uppercase tracking-wide md:text-4xl">Order {order.orderNumber}</h1>
      <div className="border border-foreground/15 bg-muted/40 px-4 py-4 text-sm">
        <p className="font-semibold uppercase tracking-[0.14em]">Order received</p>
        <p className="mt-2 text-muted-foreground">
          We will confirm payment and dispatch details shortly. Keep the order number handy.
        </p>
      </div>
      <OrderDetailsPanel order={order} currency={store.tenant.currency} />
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/account/orders/${order.id}`}>View order</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}
