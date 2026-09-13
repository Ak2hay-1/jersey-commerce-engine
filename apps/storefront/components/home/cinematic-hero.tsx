'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { HomepageBannerSlide, HomepageSection, StorefrontProductListItem } from '@jersey-commerce/types';
import { Magnetic } from '../motion/magnetic';
import { ProductImage } from '../catalog/product-image';
import { resolveDemoMediaUrl } from '../../lib/demo-media';
import { formatMoney } from '../../lib/format';
import { MOTION_EASE, MOTION_HERO } from '../motion/presence';
import { useStore } from '../providers/store-provider';

const AUTOPLAY_MS = 5500;

const FLOAT_POSES = [
  { className: 'hero-float-card hero-float-card--left', rotate: -8, y: [0, -10, 0] as number[] },
  { className: 'hero-float-card hero-float-card--right', rotate: 7, y: [0, -14, 0] as number[] },
  { className: 'hero-float-card hero-float-card--mid', rotate: -3, y: [0, -8, 0] as number[] },
];

function slidesFromSection(
  section?: HomepageSection,
  fallbackImage?: StorefrontProductListItem['primaryImage'],
): HomepageBannerSlide[] {
  if (section?.slides?.length) {
    return section.slides.filter((slide) => slide.image || slide.heading || slide.subheading);
  }
  const image = section?.image || fallbackImage?.url;
  if (!image && !section?.heading && !section?.subheading) {
    return [];
  }
  return [
    {
      image: image ?? '',
      heading: section?.heading?.trim() || 'Rule the pitch',
      subheading: section?.subheading ?? 'Match-day kits for the stands, the street, and every kick-off.',
      ctaLabel: section?.ctaLabel || 'Shop jerseys',
      ctaHref: section?.ctaHref || '/products',
    },
  ];
}

export function CinematicHero({
  section: sectionProp,
  fallbackImage,
  featuredProducts = [],
  currency = 'INR',
}: {
  section?: HomepageSection;
  fallbackImage?: StorefrontProductListItem['primaryImage'];
  featuredProducts?: StorefrontProductListItem[];
  currency?: string;
}): React.JSX.Element {
  const store = useStore();
  const section =
    store.website.homepage.sections.find((item) => item.type === 'hero') ?? sectionProp;
  const reduced = useReducedMotion();
  const slides = useMemo(() => slidesFromSection(section, fallbackImage), [section, fallbackImage]);
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const count = slides.length;
  const brand = store.tenant.name?.trim() || 'Jerzyfy';
  const floatProducts = featuredProducts.slice(0, 3);

  useEffect(() => {
    setActive(0);
  }, [slides]);

  const go = useCallback(
    (nextDirection: number) => {
      if (count < 2) {
        return;
      }
      setDirection(nextDirection);
      setActive((current) => (current + nextDirection + count) % count);
    },
    [count],
  );

  const goTo = useCallback(
    (index: number) => {
      if (index === active || index < 0 || index >= count) {
        return;
      }
      setDirection(index > active ? 1 : -1);
      setActive(index);
    },
    [active, count],
  );

  useEffect(() => {
    if (reduced || count < 2) {
      return;
    }
    const timer = window.setInterval(() => go(1), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [reduced, count, go]);

  const slide = slides[active] ?? slides[0];
  const image = resolveDemoMediaUrl(slide?.image);
  const heading = slide?.heading?.trim() || 'Rule the pitch';
  const subheading = slide?.subheading?.trim();
  const href = slide?.ctaHref || '/products';
  const label = slide?.ctaLabel || 'Shop jerseys';
  const slideKey = slide?.id ?? `${slide?.image ?? 'empty'}-${active}`;

  const imageVariants = reduced
    ? {
        enter: { opacity: 1 },
        center: { opacity: 1 },
        exit: { opacity: 1 },
      }
    : {
        enter: { opacity: 0, scale: 1.04, x: direction > 0 ? '5%' : '-5%' },
        center: { opacity: 1, scale: 1, x: '0%' },
        exit: { opacity: 0, scale: 1.02, x: direction > 0 ? '-4%' : '4%' },
      };

  const copyContainer = reduced
    ? undefined
    : {
        enter: {},
        center: {
          transition: { staggerChildren: 0.09, delayChildren: 0.08 },
        },
        exit: {
          transition: { staggerChildren: 0.04, staggerDirection: -1 },
        },
      };

  const copyItem = reduced
    ? {
        enter: { opacity: 1 },
        center: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        enter: { opacity: 0, y: 20 },
        center: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -12 },
      };

  return (
    <section
      className="home-pitch relative flex min-h-[85dvh] flex-col overflow-hidden bg-[hsl(var(--hero-plane))] text-foreground sm:min-h-[90dvh] lg:min-h-[92dvh]"
      aria-roledescription="carousel"
      aria-label="Homepage banners"
    >
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={slideKey}
          className="absolute inset-0"
          custom={direction}
          variants={imageVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: reduced ? 0.2 : MOTION_HERO, ease: MOTION_EASE }}
        >
          {image ? (
            <ProductImage
              src={image}
              alt={heading}
              className={`object-cover ${reduced ? '' : 'animate-ken-burns'}`}
              sizes="100vw"
              priority={active === 0}
              fill
            />
          ) : (
            <div className="absolute inset-0 bg-[hsl(var(--hero-plane))]" />
          )}
        </motion.div>
      </AnimatePresence>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_60%_20%,rgba(122,31,31,0.28),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/25" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-transparent" />

      {floatProducts.map((product, index) => {
        const pose = FLOAT_POSES[index] ?? FLOAT_POSES[0]!;
        return (
          <motion.div
            key={product.id}
            className={pose.className}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={
              reduced
                ? { opacity: 1, rotate: pose.rotate }
                : { opacity: 1, rotate: pose.rotate, y: pose.y }
            }
            transition={
              reduced
                ? { duration: 0.2 }
                : {
                    opacity: { duration: 0.5, delay: 0.2 + index * 0.08, ease: MOTION_EASE },
                    rotate: { duration: 0.5, delay: 0.2 + index * 0.08, ease: MOTION_EASE },
                    y: { duration: 4.5 + index, repeat: Infinity, ease: 'easeInOut' },
                  }
            }
          >
            <Link href={`/products/${product.slug}`} className="hero-float-card-inner block cursor-pointer">
              <div className="overflow-hidden rounded-2xl bg-white/95 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
                <div className="relative aspect-[3/4] w-full bg-[#eceae6]">
                  <ProductImage
                    src={product.primaryImage?.url}
                    alt={product.primaryImage?.altText ?? product.name}
                    className="object-cover"
                    sizes="200px"
                    fill
                  />
                </div>
                <div className="flex items-center justify-between gap-2 bg-black/80 px-3 py-2.5 text-white backdrop-blur-md">
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em]">{product.name}</p>
                    <p className="mt-0.5 text-xs font-bold">
                      {formatMoney(product.lowestPrice, currency) || 'Shop'}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-black">
                    Shop
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}

      <div className="relative z-10 mx-auto flex w-full max-w-store flex-1 flex-col items-center justify-center store-gutter pb-24 pt-28 text-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${slideKey}-copy`}
            className="max-w-4xl"
            variants={copyContainer}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <motion.p
              variants={copyItem}
              transition={{ duration: reduced ? 0.12 : 0.5, ease: MOTION_EASE }}
              className="font-heading text-[clamp(2.5rem,10vw,5.5rem)] leading-[0.88] tracking-tight text-white"
            >
              {brand}
            </motion.p>
            <motion.h1
              variants={copyItem}
              transition={{ duration: reduced ? 0.12 : 0.45, ease: MOTION_EASE }}
              className="mt-4 text-[clamp(1.75rem,6vw,3.75rem)] font-black uppercase italic leading-[0.95] tracking-tight text-white drop-shadow-[0_8px_32px_rgba(0,0,0,0.55)]"
            >
              {heading}
            </motion.h1>
            {subheading ? (
              <motion.p
                variants={copyItem}
                transition={{ duration: reduced ? 0.12 : 0.45, ease: MOTION_EASE }}
                className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/70 sm:text-base"
              >
                {subheading}
              </motion.p>
            ) : null}
            <motion.div
              variants={copyItem}
              transition={{ duration: reduced ? 0.12 : 0.45, ease: MOTION_EASE }}
              className="mt-9"
            >
              <Magnetic className="inline-block w-fit">
                <Link href={href} className="store-pill-accent cursor-pointer px-8 py-3.5 sm:px-10">
                  {label}
                </Link>
              </Magnetic>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/40 text-white transition-colors hover:border-[hsl(var(--accent))] hover:bg-black/60 sm:left-4"
            aria-label="Previous banner"
            onClick={() => go(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/40 text-white transition-colors hover:border-[hsl(var(--accent))] hover:bg-black/60 sm:right-4"
            aria-label="Next banner"
            onClick={() => go(1)}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
            {slides.map((item, index) => (
              <button
                key={item.id ?? `${item.image}-${index}`}
                type="button"
                aria-label={`Show banner ${index + 1}`}
                aria-current={index === active}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full p-3"
                onClick={() => goTo(index)}
              >
                <span
                  className={`block h-1.5 rounded-full transition-all duration-300 ${
                    index === active ? 'w-7 bg-[hsl(var(--accent))]' : 'w-1.5 bg-white/35'
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-1.5" aria-hidden>
          <span className="block h-1 w-8 rounded-full bg-white/80" />
          <span className="block h-1 w-4 rounded-full bg-white/30" />
          <span className="block h-1 w-4 rounded-full bg-white/30" />
        </div>
      )}
    </section>
  );
}
