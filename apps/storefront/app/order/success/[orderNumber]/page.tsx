import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@jersey-commerce/ui';
import { storeApi } from '../../../../lib/api';
import { serverStoreOptions } from '../../../../lib/server-options';
import { StoreApiError } from '../../../../lib/errors';
import { formatMoney } from '../../../../lib/format';
import { nextStepCopy, OrderStatus } from '../../../../components/account/order-status';

type Params = { orderNumber: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { orderNumber } = await params;
  return { title: `Order ${orderNumber}` };
}

export default async function OrderSuccessPage({ params }: { params: Promise<Params> }): Promise<React.JSX.Element> {
  const { orderNumber } = await params;
  const options = await serverStoreOptions();
  if (!options.accessToken) {
    return (
      <div className="mx-auto max-w-lg store-gutter py-12 text-center md:py-16">
        <h1 className="break-words font-heading text-3xl uppercase tracking-wide md:text-4xl">Order placed</h1>
        <p className="mt-3 text-muted-foreground">
          Your order number is <strong>{orderNumber}</strong>. Pay cash on delivery when it arrives. Sign in to view full details.
        </p>
        <Button asChild className="mt-6">
          <Link href="/auth/login">View order</Link>
        </Button>
      </div>
    );
  }
  let order;
  try {
    order = await storeApi.order(orderNumber, options);
  } catch (error) {
    if (error instanceof StoreApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
  const store = await storeApi.bootstrap(options);

  return (
    <div className="mx-auto max-w-3xl space-y-6 store-gutter py-10 md:py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Thank you</p>
      <h1 className="break-words font-heading text-3xl uppercase tracking-wide md:text-4xl">Order {order.orderNumber}</h1>
      <p className="text-muted-foreground">{nextStepCopy(order)}</p>
      <div className="border border-foreground/15 bg-muted/40 px-4 py-4 text-sm">
        <p className="font-semibold uppercase tracking-[0.14em]">Cash on delivery</p>
        <p className="mt-2 text-muted-foreground">Pay the rider when your order arrives. Keep the order number handy.</p>
      </div>
      <p className="text-sm">
        Status: {order.status.replaceAll('_', ' ')} · Payment: {order.paymentState.replaceAll('_', ' ')}
      </p>
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
      {order.shippingAddress ? (
        <p className="text-sm text-muted-foreground">
          Deliver to {order.shippingAddress.fullName}, {order.shippingAddress.addressLine1}, {order.shippingAddress.city}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Store pickup</p>
      )}
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
