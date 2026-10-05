'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { CartDto, CheckoutQuote, ShippingQuoteResult } from '@jersey-commerce/types';
import { cn } from '@jersey-commerce/ui';
import { formatMoney } from '../../lib/format';
import { ProductImage } from '../catalog/product-image';

export function CheckoutSummary({
  cart,
  quote,
  currency,
  shippingQuote,
}: {
  cart: CartDto;
  quote?: CheckoutQuote | null;
  currency: string;
  shippingQuote?: ShippingQuoteResult | null;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const totals = quote?.totals ?? cart.totals;
  const shippingAmount =
    shippingQuote?.calculationMode === 'DELHIVERY' && shippingQuote.shippingAmount
      ? shippingQuote.shippingAmount
      : totals.shippingAmount;
  const merchandise = Number(totals.total) - Number(totals.shippingAmount);
  const displayTotal =
    shippingQuote?.calculationMode === 'DELHIVERY'
      ? (merchandise + Number(shippingAmount)).toFixed(2)
      : totals.total;

  return (
    <aside className="panel overflow-hidden">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between gap-3 p-5 text-left lg:pointer-events-none lg:cursor-default"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex items-center gap-2 font-heading text-xl uppercase tracking-wide">
          Order summary
          <ChevronDown className={cn('h-4 w-4 transition-transform lg:hidden', open && 'rotate-180')} aria-hidden />
        </span>
        <span className="tabular font-heading text-xl font-bold lg:hidden">{formatMoney(displayTotal, currency)}</span>
      </button>
      <div className={cn('border-t border-white/10 px-5 pb-5 pt-4 lg:block', open ? 'block' : 'hidden')}>
        <ul className="space-y-4">
          {cart.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <span className="relative h-16 w-[3.25rem] shrink-0 overflow-hidden rounded-md bg-[hsl(var(--surface-2))]">
                <ProductImage src={item.imageUrl} alt={item.imageAlt ?? item.productName} className="object-cover" sizes="52px" fill />
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background">
                  {item.quantity}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm leading-snug">{item.productName}</span>
                {item.size || item.color ? (
                  <span className="text-xs text-muted-foreground">{[item.size, item.color].filter(Boolean).join(' · ')}</span>
                ) : null}
              </span>
              <span className="tabular shrink-0 text-sm">{formatMoney(item.lineTotal, currency)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-5 space-y-2.5 border-t border-white/10 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular">{formatMoney(totals.subtotal, currency)}</dd>
          </div>
          {Number(totals.discount) > 0 ? (
            <div className="flex justify-between text-emerald-300">
              <dt>Discount{cart.promoCode ? ` (${cart.promoCode.code})` : ''}</dt>
              <dd className="tabular">−{formatMoney(totals.discount, currency)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping{shippingQuote?.selectedMode ? ` (${shippingQuote.selectedMode})` : ''}</dt>
            <dd className="tabular">{Number(shippingAmount) > 0 ? formatMoney(shippingAmount, currency) : 'Free'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Tax</dt>
            <dd className="tabular">{formatMoney(totals.tax, currency)}</dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-white/10 pt-4">
            <dt className="font-heading text-lg uppercase tracking-wide">Total</dt>
            <dd className="tabular font-heading text-3xl font-bold">{formatMoney(displayTotal, currency)}</dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}
