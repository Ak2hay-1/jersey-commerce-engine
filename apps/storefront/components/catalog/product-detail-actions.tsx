'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BadgeCheck, Check, RotateCcw, Ruler, Truck } from 'lucide-react';
import type { StorefrontProductDetail, StorefrontVariant } from '@jersey-commerce/types';
import { ProductVariantSelector } from './product-variant-selector';
import { ProductImage } from './product-image';
import { openProductAccordion } from './product-accordions';
import { QuantitySelector } from '../ui/quantity-selector';
import { PriceDisplay } from './price-display';
import { useCart } from '../providers/cart-provider';
import { publicErrorMessage } from '../../lib/errors';
import { formatMoney } from '../../lib/format';
import { Alert } from '../ui/alert';
import { MOTION_EASE, MOTION_TRANSITION } from '../motion/presence';

const TRUST = [
  { icon: Truck, title: 'Free delivery', body: 'On orders above ₹2,000' },
  { icon: RotateCcw, title: 'Easy exchange', body: 'Within 7 days' },
  { icon: BadgeCheck, title: 'Premium quality', body: 'Match-day finish' },
];

export function ProductDetailActions({
  product,
  currency,
}: {
  product: StorefrontProductDetail;
  currency: string;
}): React.JSX.Element {
  const router = useRouter();
  const { addItem } = useCart();
  const [selected, setSelected] = useState<StorefrontVariant | undefined>(
    product.variants.length === 1 ? product.variants[0] : undefined,
  );
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState(false);
  const [sticky, setSticky] = useState(false);
  const addedTimer = useRef<number | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const needsVariant = product.variants.length > 1;
  const canBuy = Boolean(selected) && selected?.availability !== 'OUT_OF_STOCK';
  const reduced = useReducedMotion();

  useEffect(() => {
    return () => {
      if (addedTimer.current) {
        window.clearTimeout(addedTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Only once the main buttons have scrolled above the viewport, not while they are still below the fold.
        setSticky(Boolean(entry && !entry.isIntersecting && entry.boundingClientRect.top < 0));
      },
      { threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  async function add(redirect = false) {
    if (!selected) {
      setError('Select a variant before adding to cart.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      await addItem(selected.id, quantity);
      if (redirect) {
        router.push('/checkout');
        return;
      }
      setAdded(true);
      if (addedTimer.current) {
        window.clearTimeout(addedTimer.current);
      }
      addedTimer.current = window.setTimeout(() => setAdded(false), 1400);
    } catch (caught) {
      setError(publicErrorMessage(caught, 'Could not add this item to cart.'));
    } finally {
      setPending(false);
    }
  }

  const soldOut = Boolean(selected) && selected?.availability === 'OUT_OF_STOCK';
  const addLabel = needsVariant && !selected ? 'Select a variant' : soldOut ? 'Sold out' : added ? 'Added' : 'Add to cart';
  const displayPrice = selected?.sellingPrice ?? product.lowestPrice ?? product.variants[0]?.sellingPrice;
  const displayCompareAt = selected?.compareAtPrice ?? product.compareAtPrice ?? product.variants[0]?.compareAtPrice;
  const thumb = product.images.find((image) => image.isPrimary) ?? product.images[0];

  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <PriceDisplay price={displayPrice} compareAt={displayCompareAt} currency={currency} size="lg" />
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Truck className="h-4 w-4 shrink-0" aria-hidden />
          Free delivery on orders above ₹2,000. Shipping calculated at checkout.
        </p>
      </div>

      <ProductVariantSelector
        variants={product.variants}
        selectedId={selected?.id}
        onSelect={setSelected}
        sizeGuide={
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={() => openProductAccordion('fit')}
          >
            <Ruler className="h-3.5 w-3.5" aria-hidden />
            Size guide
          </button>
        }
      />

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div ref={sentinel} className="space-y-3">
        <div className="flex gap-3">
          <QuantitySelector value={quantity} onChange={setQuantity} max={selected?.remaining ?? 99} disabled={!canBuy} />
          <button
            type="button"
            className="btn btn-lg btn-primary flex-1 cursor-pointer"
            disabled={!canBuy || pending}
            aria-label={addLabel}
            onClick={() => void add(false)}
          >
            <motion.span
              key={addLabel}
              className="inline-flex items-center gap-2"
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: MOTION_EASE }}
            >
              {added ? <Check className="h-4 w-4" aria-hidden /> : null}
              {pending ? 'Adding…' : addLabel}
            </motion.span>
          </button>
        </div>
        <button
          type="button"
          className="btn btn-lg btn-secondary w-full cursor-pointer"
          disabled={!canBuy || pending}
          onClick={() => void add(true)}
        >
          Buy now
        </button>
      </div>

      <ul className="grid grid-cols-3 gap-2">
        {TRUST.map(({ icon: Icon, title, body }) => (
          <li key={title} className="panel flex flex-col items-center gap-1.5 px-2 py-4 text-center">
            <Icon className="h-5 w-5 text-[hsl(var(--accent))]" aria-hidden />
            <span className="text-xs font-semibold">{title}</span>
            <span className="text-[11px] leading-tight text-muted-foreground">{body}</span>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {sticky ? (
          <motion.div
            key="pdp-sticky-buy"
            className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[hsl(var(--surface-1)/0.96)] px-[max(1rem,env(safe-area-inset-left))] py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden"
            initial={reduced ? { opacity: 0 } : { y: '100%' }}
            animate={reduced ? { opacity: 1 } : { y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: '100%' }}
            transition={MOTION_TRANSITION}
          >
            <div className="flex items-center gap-3">
              <span className="relative h-12 w-10 shrink-0 overflow-hidden rounded-md bg-[hsl(var(--surface-2))]">
                <ProductImage src={thumb?.url} alt="" className="object-cover" sizes="40px" fill />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-muted-foreground">
                  {product.name}
                  {selected?.size ? ` · ${selected.size}` : ''}
                </p>
                <p className="tabular font-heading text-lg font-bold leading-tight">{formatMoney(displayPrice, currency)}</p>
              </div>
              <button
                type="button"
                className="btn btn-primary shrink-0 cursor-pointer px-5"
                disabled={pending || (selected ? !canBuy : false)}
                aria-label={selected ? addLabel : 'Choose size'}
                onClick={() => {
                  if (!selected) {
                    sentinel.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                  }
                  void add(false);
                }}
              >
                {selected ? (pending ? 'Adding…' : addLabel) : 'Choose size'}
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
