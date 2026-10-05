'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Plus, X } from 'lucide-react';
import type { StorefrontProductListItem, StorefrontVariant } from '@jersey-commerce/types';
import { cn } from '@jersey-commerce/ui';
import { sortUniqueSizes } from '@jersey-commerce/utils';
import { ProductImage } from './product-image';
import { discountPercent, formatMoney } from '../../lib/format';
import { storeApi } from '../../lib/api';
import { useCart } from '../providers/cart-provider';
import { publicErrorMessage } from '../../lib/errors';
import { MOTION_DURATION, MOTION_EASE } from '../motion/presence';

const NEW_WINDOW_MS = 1000 * 60 * 60 * 24 * 30;

function isNew(createdAt: string | undefined): boolean {
  if (!createdAt) {
    return false;
  }
  const created = Date.parse(createdAt);
  return Number.isFinite(created) && Date.now() - created < NEW_WINDOW_MS;
}

export function ProductCard({
  product,
  currency = 'INR',
  priority = false,
}: {
  product: StorefrontProductListItem;
  currency?: string;
  priority?: boolean;
}): React.JSX.Element {
  const out = product.availability === 'OUT_OF_STOCK';
  const low = product.availability === 'LOW_STOCK';
  const { addItem } = useCart();
  const [picking, setPicking] = useState(false);
  const [variants, setVariants] = useState<StorefrontVariant[] | null>(null);
  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reduced = useReducedMotion();

  const discount = product.lowestPrice ? discountPercent(product.lowestPrice, product.compareAtPrice) : null;
  const price = formatMoney(product.lowestPrice, currency);
  const compareAt = discount && product.compareAtPrice ? formatMoney(product.compareAtPrice, currency) : null;
  const kicker = product.category?.name ?? product.brand ?? null;

  function flashAdded() {
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  }

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
        flashAdded();
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
      flashAdded();
    } catch (caught) {
      setError(publicErrorMessage(caught, 'Could not add this item.'));
    } finally {
      setPending(false);
    }
  }

  const sizes = sortUniqueSizes((variants ?? []).map((item) => item.size));

  return (
    <article className="product-card group relative flex h-full flex-col">
      <div className="product-card-media">
        <Link
          href={`/products/${product.slug}`}
          className="relative block aspect-[4/5] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <ProductImage
            src={product.primaryImage?.url}
            alt={product.primaryImage?.altText ?? product.name}
            className={cn('object-cover', out && 'opacity-50 grayscale-[30%]')}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            fill
          />
        </Link>

        <div className="pointer-events-none absolute left-2.5 top-2.5 z-[2] flex flex-col items-start gap-1.5">
          {out ? <span className="badge badge-muted">Sold out</span> : null}
          {!out && discount ? <span className="badge badge-sale">−{discount}%</span> : null}
          {!out && !discount && isNew(product.createdAt) ? <span className="badge badge-new">New</span> : null}
          {low ? <span className="badge badge-warn">Low stock</span> : null}
        </div>

        {!out ? (
          <>
            <div className="product-card-quick absolute inset-x-2.5 bottom-2.5 z-[2]">
              <button
                type="button"
                className="btn btn-primary w-full cursor-pointer text-sm"
                disabled={pending}
                onClick={() => void onAdd()}
              >
                {pending ? 'Adding…' : added ? 'Added' : 'Add to cart'}
              </button>
            </div>
            <button
              type="button"
              aria-label="Quick add"
              className="product-card-plus absolute bottom-2.5 right-2.5 z-[2] h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-foreground text-background shadow-lg disabled:opacity-60"
              disabled={pending}
              onClick={() => void onAdd()}
            >
              <Plus className="h-5 w-5" />
            </button>
          </>
        ) : null}

        <AnimatePresence>
          {picking ? (
            <motion.div
              key="size-picker"
              className="absolute inset-x-0 bottom-0 z-[3] border-t border-white/10 bg-[hsl(var(--surface-2)/0.96)] p-3 backdrop-blur-md"
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: MOTION_DURATION, ease: MOTION_EASE }}
            >
              <div className="flex items-center justify-between">
                <p className="text-micro text-muted-foreground">Select size</p>
                <button
                  type="button"
                  aria-label="Close size picker"
                  className="-mr-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                  onClick={() => setPicking(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
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
                        'h-10 cursor-pointer rounded-md border border-white/15 text-sm font-semibold transition-colors hover:border-foreground hover:bg-foreground hover:text-background',
                        unavailable && 'cursor-not-allowed line-through opacity-35 hover:border-white/15 hover:bg-transparent hover:text-foreground',
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

      <div className="flex flex-1 flex-col gap-1 pt-3">
        {kicker ? <p className="truncate text-micro text-muted-foreground">{kicker}</p> : null}
        <h3 className="font-sans text-sm font-medium leading-snug tracking-normal sm:text-[15px]">
          <Link href={`/products/${product.slug}`} className="line-clamp-2 cursor-pointer hover:underline hover:underline-offset-4">
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1">
          <span className="tabular font-heading text-lg font-bold tracking-wide">{price || 'View'}</span>
          {compareAt ? <span className="tabular text-xs text-muted-foreground line-through">{compareAt}</span> : null}
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </article>
  );
}
