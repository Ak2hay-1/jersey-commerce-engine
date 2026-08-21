'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import type { StorefrontProductListItem } from '@jersey-commerce/types';
import { ProductImage } from '../catalog/product-image';

const DESKTOP_RADIUS = 520;
const AUTOPLAY_MS = 3000;

function formatRs(amount: string | null | undefined): string {
  const value = Number(amount);
  if (!amount || Number.isNaN(value)) {
    return '';
  }
  return `Rs. ${value.toFixed(2)}`;
}

function wrappedOffset(index: number, active: number, total: number): number {
  const relativeIndex = (index - active + total) % total;
  return relativeIndex > total / 2 ? relativeIndex - total : relativeIndex;
}

function cardPose(
  index: number,
  active: number,
  total: number,
  radius: number,
  visibleSpan: number,
): {
  transform: string;
  opacity: number;
  zIndex: number;
  visible: boolean;
} {
  const adjustedIndex = wrappedOffset(index, active, total);
  const visible = total <= visibleSpan * 2 + 1 || Math.abs(adjustedIndex) <= visibleSpan;
  const angleStep = (Math.PI * 2) / total;
  const angle = adjustedIndex * angleStep;
  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius - radius;
  const rotateY = -angle * (180 / Math.PI);
  const scale = Math.max(1 - Math.abs(adjustedIndex) * 0.12, 0.78);
  const opacity = visible ? Math.max(1 - Math.abs(adjustedIndex) * 0.12, 0.76) : 0;
  return {
    transform: `translate3d(${x}px, 0, ${z}px) rotateY(${rotateY}deg) scale(${scale})`,
    opacity,
    zIndex: Math.round(100 - Math.abs(adjustedIndex) * 10),
    visible,
  };
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
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [radius, setRadius] = useState(DESKTOP_RADIUS);
  const [visibleSpan, setVisibleSpan] = useState(2);
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
    const node = stageRef.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(Boolean(entry?.isIntersecting));
      },
      { rootMargin: '25% 0px', threshold: 0.05 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) {
      return;
    }
    const target = node;
    function measure() {
      const width = target.clientWidth;
      setRadius(Math.round(Math.min(DESKTOP_RADIUS, Math.max(150, width * 0.46))));
      setVisibleSpan(width < 640 ? 1 : 2);
    }
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(target);
    return () => resize.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || paused || !inView || count < 2) {
      return;
    }
    const timer = window.setInterval(() => go(1), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [reduced, paused, inView, count, go]);

  if (items.length === 0) {
    return null;
  }

  return (
    <section
      ref={stageRef}
      className={`coverflow-stage relative text-white${inView ? '' : ' is-offscreen'}`}
      aria-roledescription="carousel"
      aria-label={heading}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="coverflow-shell">
        {heading ? <h2 className="coverflow-heading">{heading}</h2> : null}

        <div className="coverflow-scene">
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
                    transform: `scale(${index === active ? 1 : 0.86})`,
                    opacity: index === active ? 1 : 0,
                    zIndex: index === active ? 100 : 0,
                    visible: index === active,
                  }
                : cardPose(index, active, count, radius, visibleSpan);
              return (
                <article
                  key={product.id}
                  className={`coverflow-card${index === active ? ' is-active' : ''}${pose.visible ? '' : ' is-hidden'}`}
                  style={{ transform: pose.transform, opacity: pose.opacity, zIndex: pose.zIndex }}
                  aria-hidden={!pose.visible}
                >
                  <Link
                    href={`/products/${product.slug}`}
                    className="coverflow-card-link"
                    tabIndex={index === active ? 0 : -1}
                    onClick={(event) => {
                      if (drag.current.moved) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <div className="coverflow-card-inner">
                      <div className="coverflow-image-wrap">
                        <ProductImage
                          src={product.primaryImage?.url}
                          alt={product.primaryImage?.altText ?? product.name}
                          className="coverflow-image object-cover"
                          sizes="(max-width: 480px) 168px, (max-width: 768px) 200px, 280px"
                          priority={index === active}
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
    </section>
  );
}
