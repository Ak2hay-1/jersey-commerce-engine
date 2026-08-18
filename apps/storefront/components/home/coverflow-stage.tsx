'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import type { StorefrontProductListItem } from '@jersey-commerce/types';
import { ProductImage } from '../catalog/product-image';
import { useStore } from '../providers/store-provider';

const RADIUS = 600;
const AUTOPLAY_MS = 3000;

function formatRs(amount: string | null | undefined): string {
  const value = Number(amount);
  if (!amount || Number.isNaN(value)) {
    return '';
  }
  return `Rs. ${value.toFixed(2)}`;
}

function cardPose(index: number, active: number, total: number): {
  transform: string;
  opacity: number;
  zIndex: number;
} {
  const relativeIndex = (index - active + total) % total;
  const adjustedIndex = relativeIndex > total / 2 ? relativeIndex - total : relativeIndex;
  const angleStep = (Math.PI * 2) / total;
  const angle = adjustedIndex * angleStep;
  const x = Math.sin(angle) * RADIUS;
  const z = Math.cos(angle) * RADIUS - RADIUS;
  const rotateY = -angle * (180 / Math.PI);
  const scale = Math.max(1 - Math.abs(adjustedIndex) * 0.15, 0.7);
  const opacity = Math.max(1 - Math.abs(adjustedIndex) * 0.2, 0.4);
  return {
    transform: `translate(-50%, -50%) translateX(${x}px) translateZ(${z}px) rotateY(${rotateY}deg) scale(${scale})`,
    opacity,
    zIndex: Math.round(100 - Math.abs(adjustedIndex) * 10),
  };
}

function Ticker({ text }: { text: string }): React.JSX.Element {
  const reduced = useReducedMotion();
  const pieces = Array.from({ length: 10 }, () => text);
  if (reduced) {
    return <p className="px-4 py-3 text-center text-sm uppercase tracking-[0.18em]">{text}</p>;
  }
  return (
    <div className="overflow-hidden">
      <div className="coverflow-ticker-track">
        {[...pieces, ...pieces].map((item, index) => (
          <span key={`${item}-${index}`} className="inline-flex items-center gap-5 whitespace-nowrap px-2">
            <span>{item}</span>
            <span aria-hidden="true">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function CoverflowStage({
  products,
  currency,
  heading = 'Featured Products',
}: {
  products: StorefrontProductListItem[];
  currency: string;
  heading?: string;
}): React.JSX.Element | null {
  const store = useStore();
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const drag = useRef({ startX: 0, currentX: 0, moved: false, dragging: false });
  const items = useMemo(() => products.slice(0, 12), [products]);
  const count = items.length;

  const go = useCallback(
    (direction: number) => {
      if (count < 2) {
        return;
      }
      setActive((current) => (current + direction + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (reduced || paused || count < 2) {
      return;
    }
    const timer = window.setInterval(() => go(1), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [reduced, paused, count, go]);

  if (items.length === 0) {
    return null;
  }

  const ticker = `THE TREND IS IN U - ${store.tenant.name.toUpperCase()}`;

  return (
    <section
      className="coverflow-stage relative text-white"
      aria-roledescription="carousel"
      aria-label={heading}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="coverflow-shell">
        {heading ? <h2 className="coverflow-heading">{heading}</h2> : null}

        <div className="coverflow-scene" data-lenis-prevent>
          {count > 1 ? (
            <button type="button" className="coverflow-nav coverflow-prev" aria-label="Previous product" onClick={() => go(-1)}>
              <ChevronLeft />
            </button>
          ) : null}
          {count > 1 ? (
            <button type="button" className="coverflow-nav coverflow-next" aria-label="Next product" onClick={() => go(1)}>
              <ChevronRight />
            </button>
          ) : null}

          <div
            className="coverflow-track"
            onPointerDown={(event) => {
              if (event.button !== 0) {
                return;
              }
              drag.current = { startX: event.pageX, currentX: event.pageX, moved: false, dragging: true };
            }}
            onPointerMove={(event) => {
              if (!drag.current.dragging) {
                return;
              }
              drag.current.currentX = event.pageX;
              if (Math.abs(drag.current.startX - event.pageX) > 10) {
                drag.current.moved = true;
              }
            }}
            onPointerUp={() => {
              if (!drag.current.dragging) {
                return;
              }
              const diff = drag.current.startX - drag.current.currentX;
              const moved = drag.current.moved;
              drag.current.dragging = false;
              if (moved && Math.abs(diff) > 50) {
                go(diff > 0 ? 1 : -1);
              }
            }}
            onPointerCancel={() => {
              drag.current.dragging = false;
            }}
          >
            {items.map((product, index) => {
              const pose = reduced
                ? {
                    transform: `translate(-50%, -50%) scale(${index === active ? 1 : 0.86})`,
                    opacity: index === active ? 1 : 0,
                    zIndex: index === active ? 100 : 0,
                  }
                : cardPose(index, active, count);
              return (
                <article key={product.id} className="coverflow-card" style={pose}>
                  <Link href={`/products/${product.slug}`} className="coverflow-card-link" tabIndex={index === active ? 0 : -1}>
                    <div className="coverflow-card-inner">
                      <div className="coverflow-image-wrap">
                        <ProductImage
                          src={product.primaryImage?.url}
                          alt={product.primaryImage?.altText ?? product.name}
                          className="coverflow-image object-cover"
                          sizes="280px"
                          fill
                        />
                      </div>
                      <div className="coverflow-copy">
                        <h3>{product.name}</h3>
                        <p className="coverflow-price">{formatRs(product.lowestPrice) || currency}</p>
                        <p className="coverflow-blurb">
                          Product Description: {product.brand ?? 'Jerzyfy'} · {product.category?.name ?? 'Limited drop'}
                        </p>
                      </div>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </div>
      <div className="relative bg-black text-[16px] uppercase tracking-[0.18em]">
        <Ticker text={ticker} />
      </div>
    </section>
  );
}
