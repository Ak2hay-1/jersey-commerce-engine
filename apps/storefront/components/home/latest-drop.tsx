'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { HomepageSection, StorefrontProductListItem } from '@jersey-commerce/types';
import { ProductCard } from '../catalog/product-card';
import { ScrollHeading } from '../motion/scroll-heading';

export function LatestDrop({
  section,
  products,
  currency,
}: {
  section: HomepageSection;
  products: StorefrontProductListItem[];
  currency: string;
}): React.JSX.Element | null {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) {
      return;
    }
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) {
      return;
    }
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollState) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro?.disconnect();
    };
  }, [products.length, updateScrollState]);

  const scrollByCard = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) {
      return;
    }
    const card = el.querySelector<HTMLElement>('[data-drop-card]');
    const gap = 24;
    const step = (card?.offsetWidth ?? el.clientWidth * 0.7) + gap;
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="py-[var(--space-section)]">
      <div className="mx-auto flex max-w-store flex-wrap items-end justify-between gap-3 store-gutter">
        {section.heading ? <ScrollHeading kicker="Drop">{section.heading}</ScrollHeading> : null}
        <div className="flex shrink-0 items-center gap-3 pb-1">
          <div className="hidden items-center gap-1 md:flex">
            <button
              type="button"
              className="drop-nav"
              aria-label="Previous kits"
              disabled={!canPrev}
              onClick={() => scrollByCard(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="drop-nav"
              aria-label="Next kits"
              disabled={!canNext}
              onClick={() => scrollByCard(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <Link href="/products?sort=newest" className="nav-link text-[11px] font-semibold uppercase tracking-[0.2em]">
            View all
          </Link>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="drop-scroll mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(1rem,env(safe-area-inset-left))] pb-2 md:gap-6"
      >
        {products.map((product) => (
          <div
            key={product.id}
            data-drop-card
            className="w-[min(18.5rem,78vw)] shrink-0 snap-start sm:w-[42vw] md:w-[28vw] lg:w-[22rem]"
          >
            <ProductCard product={product} currency={currency} />
          </div>
        ))}
      </div>
    </section>
  );
}
