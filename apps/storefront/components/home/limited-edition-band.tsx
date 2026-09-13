'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { StorefrontProductListItem } from '@jersey-commerce/types';
import { ProductImage } from '../catalog/product-image';
import { DEMO_CTA_IMAGE, DEMO_STREET_IMAGE, resolveDemoMediaUrl } from '../../lib/demo-media';
import { MOTION_EASE } from '../motion/presence';

type Slide = {
  id: string;
  href: string;
  image?: string | null;
  title: string;
  label: string;
};

export function LimitedEditionBand({
  products,
  brand = 'Jerzyfy',
}: {
  products: StorefrontProductListItem[];
  brand?: string;
}): React.JSX.Element {
  const reduced = useReducedMotion();
  const slides: Slide[] =
    products.length > 0
      ? products.slice(0, 6).map((product) => ({
          id: product.id,
          href: `/products/${product.slug}`,
          image: product.primaryImage?.url,
          title: product.name,
          label: 'Shop Now',
        }))
      : [
          {
            id: 'fallback-a',
            href: '/products',
            image: DEMO_STREET_IMAGE,
            title: 'Limited Edition',
            label: 'Shop Now',
          },
          {
            id: 'fallback-b',
            href: '/products',
            image: DEMO_CTA_IMAGE,
            title: 'Match Day Drop',
            label: 'Shop Now',
          },
        ];

  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);

  const go = useCallback(
    (nextDirection: number) => {
      setDirection(nextDirection);
      setActive((current) => (current + nextDirection + slides.length) % slides.length);
    },
    [slides.length],
  );

  useEffect(() => {
    if (reduced || slides.length < 2) {
      return;
    }
    const timer = window.setInterval(() => go(1), 5000);
    return () => window.clearInterval(timer);
  }, [reduced, slides.length, go]);

  const slide = slides[active] ?? slides[0]!;
  const image = resolveDemoMediaUrl(slide.image) ?? slide.image;

  return (
    <section className="home-light-band relative overflow-hidden pb-[var(--space-section)] pt-6">
      <div className="relative z-10 mx-auto max-w-store store-gutter">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-black">
          <div className="relative aspect-[16/10] min-h-[18rem] sm:aspect-[21/9] sm:min-h-[22rem]">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={slide.id}
                className="absolute inset-0"
                initial={reduced ? { opacity: 0 } : { opacity: 0, x: direction > 0 ? '8%' : '-8%' }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, x: direction > 0 ? '-6%' : '6%' }}
                transition={{ duration: reduced ? 0.2 : 0.55, ease: MOTION_EASE }}
              >
                {image ? (
                  <ProductImage
                    src={image}
                    alt={slide.title}
                    className="object-cover"
                    sizes="100vw"
                    fill
                  />
                ) : (
                  <div className="absolute inset-0 bg-neutral-800" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-8 md:p-10">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">Featured</p>
                    <h3 className="mt-2 max-w-xl font-heading text-[clamp(1.75rem,5vw,3.5rem)] uppercase leading-none text-white">
                      Limited Edition
                    </h3>
                    <p className="mt-2 max-w-sm truncate text-sm text-white/75">{slide.title}</p>
                  </div>
                  <Link
                    href={slide.href}
                    className="shrink-0 rounded-full bg-white px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-black"
                  >
                    {slide.label}
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {slides.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white sm:left-5"
                aria-label="Previous limited edition"
                onClick={() => go(-1)}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white sm:right-5"
                aria-label="Next limited edition"
                onClick={() => go(1)}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
                {slides.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`Show slide ${index + 1}`}
                    className={`h-1.5 cursor-pointer rounded-full transition-all ${
                      index === active ? 'w-6 bg-white' : 'w-1.5 bg-white/35'
                    }`}
                    onClick={() => {
                      setDirection(index > active ? 1 : -1);
                      setActive(index);
                    }}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="brand-marquee mt-10 overflow-hidden" aria-hidden>
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
