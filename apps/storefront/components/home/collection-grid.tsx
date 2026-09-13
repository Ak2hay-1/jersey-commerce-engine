'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import type { HomepageSection, StorefrontProductListItem } from '@jersey-commerce/types';
import { ProductImage } from '../catalog/product-image';
import { formatMoney } from '../../lib/format';
import { MOTION_EASE } from '../motion/presence';

export function CollectionGrid({
  section,
  products,
  currency,
}: {
  section: HomepageSection;
  products: StorefrontProductListItem[];
  currency: string;
}): React.JSX.Element | null {
  const reduced = useReducedMotion();
  const listed = products.slice(0, 6);

  if (listed.length === 0) {
    return null;
  }

  return (
    <section className="collection-grid relative overflow-hidden border-y border-white/10 py-[var(--space-section)]">
      <div className="collection-grid-ghost pointer-events-none absolute inset-0" aria-hidden>
        <span>COLLECTION</span>
        <span>COLLECTION</span>
        <span>COLLECTION</span>
      </div>
      <div className="relative z-10 mx-auto max-w-store store-gutter">
        {section.heading ? (
          <h2 className="font-heading text-[clamp(1.75rem,5vw,3rem)] uppercase tracking-tight text-white">
            {section.heading}
          </h2>
        ) : (
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">Collection</h2>
        )}
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
          {listed.map((product, index) => (
            <motion.article
              key={product.id}
              className="collection-card group"
              initial={reduced ? false : { opacity: 0, y: 18 }}
              whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.45, delay: index * 0.05, ease: MOTION_EASE }}
              whileHover={reduced ? undefined : { scale: 1.06, zIndex: 2 }}
            >
              <Link href={`/products/${product.slug}`} className="block cursor-pointer overflow-hidden rounded-2xl">
                <div className="relative aspect-[3/4] bg-[#e8e6e1]">
                  <ProductImage
                    src={product.primaryImage?.url}
                    alt={product.primaryImage?.altText ?? product.name}
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    fill
                  />
                </div>
                <div className="flex items-end justify-between gap-3 bg-[#141414] px-4 py-4 text-white">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium tracking-wide">{product.name}</h3>
                    <p className="mt-1 text-base font-bold">
                      {formatMoney(product.lowestPrice, currency) || 'View'}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-black px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] ring-1 ring-white/20 transition group-hover:bg-[hsl(var(--accent))] group-hover:ring-[hsl(var(--accent))]">
                    Shop Now
                  </span>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
