'use client';

import Link from 'next/link';
import { Button } from '@jersey-commerce/ui';
import { useCart } from '../providers/cart-provider';
import { useStore } from '../providers/store-provider';
import { CartItemRow } from './cart-item';
import { PromoCodeField } from './promo-code-field';
import { formatMoney } from '../../lib/format';
import { EmptyState } from '../ui/empty-state';
import { Alert } from '../ui/alert';
import { LoadingSkeleton } from '../ui/loading-skeleton';

export function CartPageView(): React.JSX.Element {
  const { cart, updateItem, removeItem, error, loading } = useCart();
  const { tenant } = useStore();

  if (loading) {
    return (
      <div className="mx-auto max-w-store space-y-4 store-gutter py-10" aria-busy="true">
        <LoadingSkeleton className="h-10 w-40" />
        <LoadingSkeleton className="h-24 w-full" />
        <LoadingSkeleton className="h-24 w-full" />
      </div>
    );
  }
  if (!cart || cart.items.length === 0) {
    return <EmptyState title="Your cart is empty" description="Browse the catalog and add a piece when you are ready." actionHref="/products" actionLabel="Continue shopping" />;
  }

  return (
    <div className="mx-auto grid max-w-store gap-8 store-gutter py-8 md:py-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10">
      <div className="space-y-6">
        <h1 className="font-heading text-3xl uppercase tracking-wide md:text-4xl">Cart</h1>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <ul className="space-y-6">
          {cart.items.map((item) => (
            <li key={item.id} className="border-b border-border pb-6">
              <CartItemRow item={item} currency={tenant.currency} onQuantity={(quantity) => void updateItem(item.id, quantity)} onRemove={() => void removeItem(item.id)} />
            </li>
          ))}
        </ul>
      </div>
      <aside className="h-fit border border-border p-4">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>{formatMoney(cart.totals.subtotal, tenant.currency)}</span>
        </div>
        {Number(cart.totals.discount) > 0 ? (
          <div className="mt-2 flex justify-between text-sm">
            <span>Discount{cart.promoCode ? ` (${cart.promoCode.code})` : ''}</span>
            <span>−{formatMoney(cart.totals.discount, tenant.currency)}</span>
          </div>
        ) : null}
        <div className="mt-4">
          <PromoCodeField />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Shipping is calculated at checkout from live store settings.</p>
        <div className="mt-4 flex justify-between font-heading text-lg uppercase">
          <span>Total</span>
          <span>{formatMoney(cart.totals.total, tenant.currency)}</span>
        </div>
        <Button asChild className="store-cta mt-4 w-full">
          <Link href="/checkout">Checkout</Link>
        </Button>
      </aside>
    </div>
  );
}
