'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { StorefrontProductListItem } from '@jersey-commerce/types';
import { ProductCard } from './product-card';
import { Reveal } from '../motion/reveal';

export function ProductRail({
  title,
  kicker,
  products,
  currency,
  viewAllHref,
  viewAllLabel = 'View all',
  className,
}: {
  title?: string | null;
  kicker?: string;
  products: StorefrontProductListItem[];
  currency: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  className?: string;
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

  const scrollByPage = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) {
      return;
    }
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  if (products.length === 0) {
    return null;
  }

  const showNav = canPrev || canNext;

  return (
    <section className={className ?? 'py-[var(--space-section)]'}>
      <div className="mx-auto max-w-store store-gutter">
        <Reveal className="section-head">
          <div>
            {kicker ? <p className="section-kicker">{kicker}</p> : null}
            {title ? <h2 className="section-title">{title}</h2> : null}
          </div>
          <div className="flex items-center gap-4">
            {viewAllHref ? (
              <Link href={viewAllHref} className="section-link">
                {viewAllLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
            {showNav ? (
              <div className="hidden items-center gap-2 md:flex">
                <button
                  type="button"
                  className="icon-btn cursor-pointer"
                  aria-label="Scroll left"
                  disabled={!canPrev}
                  onClick={() => scrollByPage(-1)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="icon-btn cursor-pointer"
                  aria-label="Scroll right"
                  disabled={!canNext}
                  onClick={() => scrollByPage(1)}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            ) : null}
          </div>
        </Reveal>
      </div>
      <div className="mx-auto max-w-store">
        <div
          ref={scrollerRef}
          className="rail-scroll store-gutter mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:gap-5 md:mt-10"
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="w-[44vw] shrink-0 snap-start sm:w-[30vw] md:w-[calc((100%-3*1.25rem)/3.3)] lg:w-[calc((100%-3*1.25rem)/4)]"
            >
              <ProductCard product={product} currency={currency} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
