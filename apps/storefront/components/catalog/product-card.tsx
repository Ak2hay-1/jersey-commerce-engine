'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { StorefrontProductListItem, StorefrontVariant } from '@jersey-commerce/types';
import { cn } from '@jersey-commerce/ui';
import { PriceDisplay } from './price-display';
import { ProductImage } from './product-image';
import { availabilityLabel } from '../../lib/format';
import { storeApi } from '../../lib/api';
import { useCart } from '../providers/cart-provider';
import { publicErrorMessage } from '../../lib/errors';

export function ProductCard({
  product,
  currency = 'INR',
}: {
  product: StorefrontProductListItem;
  currency?: string;
}): React.JSX.Element {
  const out = product.availability === 'OUT_OF_STOCK';
  const { addItem } = useCart();
  const [picking, setPicking] = useState(false);
  const [variants, setVariants] = useState<StorefrontVariant[] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAdd() {
    if (out || pending) {
      return;
    }
    setError(null);
    setPending(true);
    try {
      const detail = variants ? { variants } : await storeApi.product(product.slug);
      const next = detail.variants;
      setVariants(next);
      const available = next.filter((item) => item.availability !== 'OUT_OF_STOCK');
      if (available.length === 1 && available[0]) {
        await addItem(available[0].id, 1);
        setPicking(false);
        return;
      }
      setPicking(true);
    } catch (caught) {
      setError(publicErrorMessage(caught, 'Could not add this item.'));
    } finally {
      setPending(false);
    }
  }

  async function pickSize(variant: StorefrontVariant) {
    if (variant.availability === 'OUT_OF_STOCK') {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await addItem(variant.id, 1);
      setPicking(false);
    } catch (caught) {
      setError(publicErrorMessage(caught, 'Could not add this item.'));
    } finally {
      setPending(false);
    }
  }

  const sizes = [...new Set((variants ?? []).map((item) => item.size).filter((value): value is string => Boolean(value)))];

  return (
    <article className="product-tile group">
      <div className="product-tile-media relative overflow-hidden bg-muted">
        <Link href={`/products/${product.slug}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ProductImage
            src={product.primaryImage?.url}
            alt={product.primaryImage?.altText ?? product.name}
            className="aspect-[3/4] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        </Link>
        {out ? (
          <span className="absolute left-3 top-3 z-[2] bg-background/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider">
            {availabilityLabel(product.availability, null)}
          </span>
        ) : null}
        <div className="product-tile-actions absolute inset-x-0 bottom-0 z-[2] flex transition-transform duration-300 ease-out">
          <Link
            href={`/products/${product.slug}`}
            className="flex-1 bg-background/90 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.14em] sm:py-3 sm:tracking-[0.2em]"
          >
            View
          </Link>
          <button
            type="button"
            className="flex-1 bg-foreground py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-background disabled:opacity-50 sm:py-3 sm:tracking-[0.2em]"
            disabled={out || pending}
            onClick={() => void onAdd()}
          >
            {pending ? 'Adding' : 'Add to cart'}
          </button>
        </div>
        {picking ? (
          <div className="absolute inset-x-0 bottom-0 z-[3] bg-background/95 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Select size</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {sizes.map((size) => {
                const variant = variants?.find((item) => item.size === size);
                const unavailable = !variant || variant.availability === 'OUT_OF_STOCK';
                return (
                  <button
                    key={size}
                    type="button"
                    disabled={unavailable || pending}
                    onClick={() => variant && void pickSize(variant)}
                    className={cn(
                      'min-h-9 min-w-9 border border-foreground/20 px-2 py-1 text-xs uppercase',
                      unavailable && 'cursor-not-allowed opacity-40',
                    )}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
      <div className="space-y-1 pt-3">
        {product.brand ? <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{product.brand}</p> : null}
        <h3>
          <Link href={`/products/${product.slug}`} className="product-tile-title font-heading text-base uppercase leading-tight tracking-wide sm:text-xl">
            {product.name}
          </Link>
        </h3>
        <PriceDisplay price={product.lowestPrice} compareAt={product.compareAtPrice} currency={currency} size="sm" />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </article>
  );
}
