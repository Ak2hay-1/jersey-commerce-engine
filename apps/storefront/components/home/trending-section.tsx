'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { CategoryDetail } from '@jersey-commerce/types';
import { DEMO_HERO_IMAGE, DEMO_KITS_IMAGE, resolveDemoMediaUrl } from '../../lib/demo-media';
import { ProductImage } from '../catalog/product-image';
import { MOTION_EASE } from '../motion/presence';

const MASK_IMAGES = [DEMO_HERO_IMAGE, DEMO_KITS_IMAGE];

export function TrendingSection({
  categories,
}: {
  categories: CategoryDetail[];
}): React.JSX.Element | null {
  const reduced = useReducedMotion();
  const coins = categories.filter((item) => !item.parentId).slice(0, 6);
  const [maskIndex, setMaskIndex] = useState(0);
  const [activeCoin, setActiveCoin] = useState(0);

  useEffect(() => {
    if (reduced || MASK_IMAGES.length < 2) {
      return;
    }
    const timer = window.setInterval(() => {
      setMaskIndex((current) => (current + 1) % MASK_IMAGES.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [reduced]);

  useEffect(() => {
    if (reduced || coins.length < 2) {
      return;
    }
    const timer = window.setInterval(() => {
      setActiveCoin((current) => (current + 1) % coins.length);
    }, 2800);
    return () => window.clearInterval(timer);
  }, [reduced, coins.length]);

  if (coins.length === 0) {
    return null;
  }

  const maskSrc = resolveDemoMediaUrl(MASK_IMAGES[maskIndex]) ?? MASK_IMAGES[0];

  return (
    <section className="home-light-band relative overflow-hidden py-[var(--space-section)]">
      <p className="pointer-events-none absolute left-1/2 top-10 -translate-x-1/2 text-[clamp(3rem,14vw,9rem)] font-black uppercase tracking-[0.2em] text-black/[0.04]">
        Insight
      </p>
      <div className="relative z-10 mx-auto max-w-store store-gutter text-center">
        <h2 className="trending-mask-heading mx-auto max-w-5xl text-[clamp(3.5rem,16vw,9rem)] font-black uppercase leading-[0.85] tracking-tight">
          <span
            className="trending-mask-fill"
            style={{ backgroundImage: `url(${maskSrc})` }}
          >
            Trending
          </span>
        </h2>

        <div
          className="category-coin-rail mt-14 flex items-center justify-center gap-4 sm:gap-6 md:gap-8"
          style={{ perspective: '900px' }}
        >
          {coins.map((category, index) => {
            const offset = index - activeCoin;
            const abs = Math.abs(offset);
            const href = `/category/${category.slug}`;
            return (
              <motion.div
                key={category.id}
                className="category-coin"
                animate={
                  reduced
                    ? { rotateY: 0, scale: 1, opacity: 1 }
                    : {
                        rotateY: offset * -28,
                        scale: abs === 0 ? 1.08 : Math.max(0.78, 1 - abs * 0.12),
                        opacity: abs > 2 ? 0.35 : 1,
                        zIndex: 10 - abs,
                      }
                }
                transition={{ duration: 0.55, ease: MOTION_EASE }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                <Link
                  href={href}
                  className="category-coin-face group relative flex h-24 w-24 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-full sm:h-28 sm:w-28 md:h-32 md:w-32"
                  onFocus={() => setActiveCoin(index)}
                  onMouseEnter={() => setActiveCoin(index)}
                >
                  {category.image ? (
                    <ProductImage
                      src={category.image}
                      alt={category.name}
                      className="absolute inset-0 object-cover"
                      sizes="128px"
                      fill
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-stone-300 to-stone-500" />
                  )}
                  <div className="absolute inset-0 bg-black/35 transition group-hover:bg-black/20" />
                  <span className="relative z-10 max-w-[85%] truncate px-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-white sm:text-[11px]">
                    {category.name}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center gap-1.5" aria-hidden>
          {coins.map((category, index) => (
            <button
              key={category.id}
              type="button"
              aria-label={`Show ${category.name}`}
              className={`h-1 cursor-pointer rounded-full transition-all ${
                index === activeCoin ? 'w-8 bg-black' : 'w-4 bg-black/25'
              }`}
              onClick={() => setActiveCoin(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
