'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, cn } from '@jersey-commerce/ui';
import type { StorefrontProductDetail, StorefrontVariant } from '@jersey-commerce/types';
import { ProductVariantSelector } from './product-variant-selector';
import { QuantitySelector } from '../ui/quantity-selector';
import { PriceDisplay } from './price-display';
import { useCart } from '../providers/cart-provider';
import { publicErrorMessage } from '../../lib/errors';
import { Alert } from '../ui/alert';

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
        setSticky(!entry?.isIntersecting);
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
      addedTimer.current = window.setTimeout(() => setAdded(false), 1200);
    } catch (caught) {
      setError(publicErrorMessage(caught, 'Could not add this item to cart.'));
    } finally {
      setPending(false);
    }
  }

  const addLabel = needsVariant && !selected ? 'Select a variant' : added ? 'Added' : 'Add to cart';

  return (
    <div className="space-y-6">
      <PriceDisplay
        price={selected?.sellingPrice ?? product.variants[0]?.sellingPrice}
        compareAt={selected?.compareAtPrice ?? product.variants[0]?.compareAtPrice}
        currency={currency}
        size="lg"
      />
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Free delivery on orders above ₹2,000. Shipping calculated at checkout.</p>
      <ProductVariantSelector variants={product.variants} selectedId={selected?.id} onSelect={setSelected} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Quantity</p>
        <div className="mt-2">
          <QuantitySelector value={quantity} onChange={setQuantity} max={selected?.remaining ?? 99} disabled={!canBuy} />
        </div>
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div ref={sentinel} className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" className="store-cta flex-1 rounded-none" disabled={!canBuy || pending} onClick={() => void add(false)}>
          {addLabel}
        </Button>
        <Button type="button" variant="outline" className="store-cta flex-1 rounded-none" disabled={!canBuy || pending} onClick={() => void add(true)}>
          Buy now
        </Button>
      </div>
      {sticky ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-foreground/10 bg-background/95 px-[max(1rem,env(safe-area-inset-left))] py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
          <Button
            type="button"
            className={cn('store-cta w-full rounded-none')}
            disabled={!canBuy || pending}
            onClick={() => void add(false)}
          >
            {addLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
