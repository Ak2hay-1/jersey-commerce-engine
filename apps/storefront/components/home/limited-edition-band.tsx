'use client';

import { useReducedMotion } from 'motion/react';
import type { StorefrontProductListItem } from '@jersey-commerce/types';
import { CoverflowStage } from './coverflow-stage';

export function LimitedEditionBand({
  products,
  brand = 'Jerzyfy',
  currency = 'INR',
}: {
  products: StorefrontProductListItem[];
  brand?: string;
  currency?: string;
}): React.JSX.Element | null {
  const reduced = useReducedMotion();

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="relative overflow-hidden">
      <CoverflowStage products={products} currency={currency} heading="Limited Edition" />
      <div className="home-light-band brand-marquee overflow-hidden py-8" aria-hidden>
        <div className={`brand-marquee-track ${reduced ? 'is-static' : ''}`}>
          {Array.from({ length: 8 }).map((_, index) => (
            <span key={index} className="brand-marquee-word">
              {brand}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
