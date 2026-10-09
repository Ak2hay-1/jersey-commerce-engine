'use client';

import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { HomepageSection, StorefrontProductListItem } from '@jersey-commerce/types';
import { cn } from '@jersey-commerce/ui';
import { ProductImage } from '../catalog/product-image';
import { MOTION_EASE, MOTION_TRANSITION } from '../motion/presence';
import { useStore } from '../providers/store-provider';
import { DEMO_HERO_IMAGE, resolveDemoMediaUrl } from '../../lib/demo-media';
import { discountPercent, formatMoney } from '../../lib/format';
import { loadGlowColor } from '../../lib/image-glow';

const SLIDE_INTERVAL_MS = 6500;

/** Per-slide stage glows; kept deep so white copy stays readable. */
const STAGE_GLOWS = ['#1f3a8a', '#8f1d2c', '#0f6b77', '#5b2a86', '#7a5a12'];

const STAGE_BACKGROUND = [
  'radial-gradient(ellipse 55% 65% at 72% 48%, color-mix(in srgb, var(--hero-glow) 80%, transparent) 0%, color-mix(in srgb, var(--hero-glow) 20%, transparent) 45%, transparent 75%)',
  'radial-gradient(ellipse 90% 70% at 20% 100%, rgba(255,255,255,0.05) 0%, transparent 60%)',
  'linear-gradient(180deg, color-mix(in srgb, var(--hero-glow) 28%, #080808) 0%, color-mix(in srgb, var(--hero-glow) 12%, #0a0a0a) 60%, #0a0a0a 100%)',
].join(', ');

export function CinematicHero({
  section: sectionProp,
  fallbackImage,
  products = [],
  currency = 'INR',
}: {
  section?: HomepageSection;
  fallbackImage?: StorefrontProductListItem['primaryImage'];
  products?: StorefrontProductListItem[];
  currency?: string;
}): React.JSX.Element {
  const store = useStore();
  const reduced = useReducedMotion();
  const section = store.website.homepage.sections.find((item) => item.type === 'hero') ?? sectionProp;

  const slides = useMemo(() => products.slice(0, 5), [products]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const product = slides[Math.min(active, Math.max(count - 1, 0))] ?? null;

  const [glows, setGlows] = useState<Record<string, string>>({});

  useEffect(() => {
    setActive(0);
  }, [slides]);

  useEffect(() => {
    let cancelled = false;
    for (const slide of slides) {
      const src = resolveDemoMediaUrl(slide.primaryImage?.url);
      if (!src) {
        continue;
      }
      void loadGlowColor(src).then((color) => {
        if (!cancelled && color) {
          setGlows((current) => (current[slide.id] === color ? current : { ...current, [slide.id]: color }));
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [slides]);

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
    const timer = window.setTimeout(() => go(1), SLIDE_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [active, count, go, paused, reduced]);

  const imageSrc =
    resolveDemoMediaUrl(product?.primaryImage?.url) ||
    resolveDemoMediaUrl(section?.image) ||
    resolveDemoMediaUrl(fallbackImage?.url) ||
    DEMO_HERO_IMAGE;

  const brand = store.tenant.name?.trim() || 'Jerzyfy';
  const kicker = section?.heading?.trim() || 'Featured kit';
  const headline = product?.name || section?.heading?.trim() || brand;
  const body =
    section?.subheading?.trim() || 'Match-day kits built for the stands, the street, and every kick-off.';
  const price = formatMoney(product?.lowestPrice, currency);
  const discount = product?.lowestPrice ? discountPercent(product.lowestPrice, product.compareAtPrice) : null;
  const compareAt = discount && product?.compareAtPrice ? formatMoney(product.compareAtPrice, currency) : null;
  const productHref = product ? `/products/${product.slug}` : section?.ctaHref || '/products';
  const glow = (product && glows[product.id]) || STAGE_GLOWS[active % STAGE_GLOWS.length];

  return (
    <section
      className="hero-stage relative isolate overflow-hidden text-white"
      style={{ ['--hero-glow' as string]: glow }}
      aria-roledescription="carousel"
      aria-label="Featured kits"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className="absolute inset-0 -z-10"
        style={{ background: STAGE_BACKGROUND }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-background to-transparent"
        aria-hidden
      />

      <div className="mx-auto flex min-h-[min(100svh,58rem)] max-w-store flex-col store-gutter pb-6 pt-20 sm:pt-24 lg:pb-10">
        <div className="grid flex-1 grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10">
          {/* Product */}
          <div className="relative order-1 lg:order-2">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${product?.id ?? 'empty'}-${imageSrc}`}
                className="relative mx-auto aspect-[4/5] w-[min(78vw,22rem)] sm:w-[min(60vw,26rem)] lg:w-full lg:max-w-[34rem]"
                initial={reduced ? { opacity: 0 } : { opacity: 0, x: 40, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, x: -30, scale: 0.98 }}
                transition={{ duration: reduced ? 0.2 : 0.55, ease: MOTION_EASE }}
              >
                <Link href={productHref} className="absolute inset-0 block cursor-pointer" tabIndex={-1} aria-hidden>
                  <ProductImage
                    src={imageSrc}
                    alt={product?.primaryImage?.altText ?? product?.name ?? 'Featured jersey'}
                    className="rounded-[calc(var(--radius)+6px)] object-cover shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)]"
                    sizes="(max-width: 1024px) 80vw, 540px"
                    priority
                    fill
                  />
                </Link>
                {discount ? (
                  <span className="badge badge-sale absolute left-4 top-4 z-10 px-3 py-1.5 text-xs">−{discount}%</span>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Copy */}
          <div className="order-2 flex flex-col items-start lg:order-1">
            <p className="section-kicker text-white/70">{kicker}</p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={product?.id ?? 'empty-copy'}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
                transition={MOTION_TRANSITION}
                className="w-full"
              >
                <h1 className="font-display mt-4 line-clamp-3 max-w-[14ch] text-[clamp(2.6rem,7.5vw,6rem)] text-white">
                  {headline}
                </h1>
                <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/70 sm:text-base">{body}</p>
                {price ? (
                  <div className="mt-6 flex items-baseline gap-3">
                    <span className="tabular font-heading text-3xl font-bold tracking-wide sm:text-4xl">{price}</span>
                    {compareAt ? <span className="tabular text-base text-white/45 line-through">{compareAt}</span> : null}
                  </div>
                ) : null}
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link href={productHref} className="btn btn-lg cursor-pointer !bg-white !text-neutral-950 hover:!bg-white/90">
                {section?.ctaLabel?.trim() || 'Shop now'}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/products" className="btn btn-lg btn-secondary cursor-pointer border-white/25 text-white">
                All jerseys
              </Link>
            </div>
          </div>
        </div>

        {count > 1 ? (
          <div className="mt-8 flex items-center gap-4 lg:mt-12">
            <div className="rail-scroll -mx-1 flex flex-1 gap-2 overflow-x-auto px-1 py-1 sm:gap-3" role="tablist" aria-label="Choose featured kit">
              {slides.map((slide, index) => {
                const selected = index === active;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-label={slide.name}
                    onClick={() => setActive(index)}
                    className={cn(
                      'group relative flex min-w-[3.25rem] shrink-0 cursor-pointer items-center gap-3 overflow-hidden rounded-lg border p-1.5 text-left transition-colors sm:min-w-[13rem] sm:pr-4',
                      selected ? 'border-white/40 bg-white/10' : 'border-white/10 bg-white/[0.03] hover:border-white/25',
                    )}
                  >
                    <span className="relative h-12 w-10 shrink-0 overflow-hidden rounded-md bg-white/5">
                      <ProductImage
                        src={slide.primaryImage?.url}
                        alt=""
                        className="object-cover"
                        sizes="48px"
                        fill
                      />
                    </span>
                    <span className="hidden min-w-0 sm:block">
                      <span className={cn('block truncate text-xs font-medium', selected ? 'text-white' : 'text-white/60')}>
                        {slide.name}
                      </span>
                      <span className="tabular mt-0.5 block text-[11px] text-white/45">
                        {formatMoney(slide.lowestPrice, currency)}
                      </span>
                    </span>
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10" aria-hidden>
                      {selected ? (
                        <span
                          key={`${active}-${paused ? 'p' : 'r'}`}
                          className={cn('block h-full bg-[color-mix(in_srgb,var(--hero-glow)_70%,white)]', !reduced && !paused && 'hero-progress')}
                          style={{ ['--hero-interval' as string]: `${SLIDE_INTERVAL_MS}ms` }}
                        />
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="hidden shrink-0 gap-2 sm:flex">
              <button type="button" className="icon-btn cursor-pointer border-white/20 text-white" aria-label="Previous kit" onClick={() => go(-1)}>
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" className="icon-btn cursor-pointer border-white/20 text-white" aria-label="Next kit" onClick={() => go(1)}>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
