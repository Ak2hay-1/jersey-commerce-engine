'use client';

import Link from 'next/link';
import { ArrowRight, Lock, ShoppingBag } from 'lucide-react';
import { useCart } from '../providers/cart-provider';
import { useStore } from '../providers/store-provider';
import { CartItemRow } from './cart-item';
import { PromoCodeField } from './promo-code-field';
import { FreeDeliveryProgress } from './free-delivery-progress';
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
        <LoadingSkeleton className="h-12 w-48" />
        <LoadingSkeleton className="h-32 w-full" />
        <LoadingSkeleton className="h-32 w-full" />
      </div>
    );
  }
  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="h-7 w-7" />}
        title="Your cart is empty"
        description="Browse the catalog and add a kit when you are ready."
        actionHref="/products"
        actionLabel="Continue shopping"
      />
    );
  }

  const total = formatMoney(cart.totals.total, tenant.currency);

  return (
    <div className="mx-auto max-w-store store-gutter pb-32 pt-8 md:pt-12 lg:pb-[var(--space-section)]">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-display text-[clamp(2.5rem,6vw,4rem)]">Cart</h1>
        <p className="tabular text-sm text-muted-foreground">
          {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'}
        </p>
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12">
        <div className="space-y-4">
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <ul className="panel divide-y divide-white/[0.08] px-4 sm:px-6">
            {cart.items.map((item) => (
              <li key={item.id} className="py-5 sm:py-6">
                <CartItemRow item={item} currency={tenant.currency} onQuantity={(quantity) => void updateItem(item.id, quantity)} onRemove={() => void removeItem(item.id)} />
              </li>
            ))}
          </ul>
          <Link href="/products" className="section-link">
            Continue shopping
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="panel space-y-5 p-5 sm:p-6">
            <h2 className="font-heading text-xl uppercase tracking-wide">Order summary</h2>
            <FreeDeliveryProgress subtotal={cart.totals.subtotal} currency={tenant.currency} />
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular">{formatMoney(cart.totals.subtotal, tenant.currency)}</dd>
              </div>
              {Number(cart.totals.discount) > 0 ? (
                <div className="flex justify-between text-emerald-300">
                  <dt>Discount{cart.promoCode ? ` (${cart.promoCode.code})` : ''}</dt>
                  <dd className="tabular">−{formatMoney(cart.totals.discount, tenant.currency)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd className="text-muted-foreground">At checkout</dd>
              </div>
            </dl>
            <PromoCodeField />
            <div className="flex items-baseline justify-between border-t border-white/10 pt-4">
              <span className="font-heading text-lg uppercase tracking-wide">Total</span>
              <span className="tabular font-heading text-3xl font-bold">{total}</span>
            </div>
            <Link href="/checkout" className="btn btn-lg btn-primary hidden w-full cursor-pointer lg:inline-flex">
              Checkout
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" aria-hidden />
              Secure checkout with Razorpay
            </p>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[hsl(var(--surface-1)/0.96)] px-[max(1rem,env(safe-area-inset-left))] py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="tabular font-heading text-xl font-bold leading-tight">{total}</p>
          </div>
          <Link href="/checkout" className="btn btn-lg btn-primary flex-1 cursor-pointer">
            Checkout
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
