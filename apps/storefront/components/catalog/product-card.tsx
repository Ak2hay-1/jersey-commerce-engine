'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { StorefrontProductListItem, StorefrontVariant } from '@jersey-commerce/types';
import { cn } from '@jersey-commerce/ui';
import { sortUniqueSizes } from '@jersey-commerce/utils';
import { PriceDisplay } from './price-display';
import { ProductImage } from './product-image';
import { availabilityLabel } from '../../lib/format';
import { storeApi } from '../../lib/api';
import { useCart } from '../providers/cart-provider';
import { publicErrorMessage } from '../../lib/errors';
import { HoverLift } from '../motion/hover-lift';
import { MOTION_DURATION, MOTION_EASE } from '../motion/presence';

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
  const reduced = useReducedMotion();

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

  async function pickSize(size: string) {
    const variant =
      variants?.find((item) => item.size === size && item.availability !== 'OUT_OF_STOCK') ??
      variants?.find((item) => item.size === size);
    if (!variant || variant.availability === 'OUT_OF_STOCK') {
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

  const sizes = sortUniqueSizes((variants ?? []).map((item) => item.size));

  return (
    <HoverLift>
      <article className="product-tile group">
        <div className="product-tile-media relative overflow-hidden border border-foreground/10 bg-muted">
          <Link
            href={`/products/${product.slug}`}
            className="block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <motion.div
              className="origin-center"
              whileHover={reduced ? undefined : { scale: 1.03 }}
              transition={{ duration: 0.5, ease: MOTION_EASE }}
            >
              <ProductImage
                src={product.primaryImage?.url}
                alt={product.primaryImage?.altText ?? product.name}
                className={cn('aspect-[3/4] w-full object-cover', out && 'opacity-55')}
              />
            </motion.div>
          </Link>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-1/3 bg-gradient-to-t from-black/55 to-transparent" />
          {out ? (
            <span className="absolute left-3 top-3 z-[2] border border-foreground/20 bg-background/95 px-2.5 py-1 text-[11px] font-medium tracking-wide">
              {availabilityLabel(product.availability, null)}
            </span>
          ) : null}
          <div className="product-tile-actions absolute inset-x-0 bottom-0 z-[2] flex gap-px p-2 transition-transform duration-300 ease-out">
            <Link
              href={`/products/${product.slug}`}
              className="flex-1 cursor-pointer bg-background/95 py-2.5 text-center text-xs font-medium tracking-wide backdrop-blur-sm sm:py-3"
            >
              View
            </Link>
            <button
              type="button"
              className="flex-1 cursor-pointer bg-foreground py-2.5 text-center text-xs font-medium tracking-wide text-background disabled:opacity-50 sm:py-3"
              disabled={out || pending}
              onClick={() => void onAdd()}
            >
              {pending ? 'Adding…' : 'Add to cart'}
            </button>
          </div>
          <AnimatePresence>
            {picking ? (
              <motion.div
                key="size-picker"
                className="absolute inset-x-0 bottom-0 z-[3] border-t border-foreground/10 bg-background/95 p-3 backdrop-blur-sm"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                transition={{ duration: MOTION_DURATION, ease: MOTION_EASE }}
              >
                <p className="text-xs font-medium text-muted-foreground">Select size</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sizes.map((size) => {
                    const unavailable = !(variants ?? []).some(
                      (item) => item.size === size && item.availability !== 'OUT_OF_STOCK',
                    );
                    return (
                      <button
                        key={size}
                        type="button"
                        disabled={unavailable || pending}
                        onClick={() => void pickSize(size)}
                        className={cn(
                          'min-h-9 min-w-9 cursor-pointer border border-foreground/20 px-2 py-1 text-xs transition-colors hover:border-foreground',
                          unavailable && 'cursor-not-allowed opacity-40',
                        )}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        <div className="space-y-1.5 pt-3">
          {product.brand ? <p className="text-xs text-muted-foreground">{product.brand}</p> : null}
          <h3>
            <Link
              href={`/products/${product.slug}`}
              className="product-tile-title cursor-pointer text-base font-medium leading-snug tracking-tight sm:text-lg"
            >
              {product.name}
            </Link>
          </h3>
          <PriceDisplay price={product.lowestPrice} compareAt={product.compareAtPrice} currency={currency} size="sm" />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
      </article>
    </HoverLift>
  );
}
