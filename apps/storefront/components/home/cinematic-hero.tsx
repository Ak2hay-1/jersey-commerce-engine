'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { HomepageBannerSlide, HomepageSection, StorefrontProductListItem } from '@jersey-commerce/types';
import { Magnetic } from '../motion/magnetic';
import { ProductImage } from '../catalog/product-image';
import { resolveDemoMediaUrl } from '../../lib/demo-media';
import { MOTION_EASE, MOTION_HERO } from '../motion/presence';
import { useStore } from '../providers/store-provider';

const AUTOPLAY_MS = 5500;

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
      heading: section?.heading?.trim() || 'Football jerseys for match day',
      subheading: section?.subheading,
      ctaLabel: section?.ctaLabel || 'Shop jerseys',
      ctaHref: section?.ctaHref || '/products',
    },
  ];
}

export function CinematicHero({
  section: sectionProp,
  fallbackImage,
}: {
  section?: HomepageSection;
  fallbackImage?: StorefrontProductListItem['primaryImage'];
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
  const heading = slide?.heading?.trim() || 'Football jerseys for match day';
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
        enter: { opacity: 0, scale: 1.03, x: direction > 0 ? '4%' : '-4%' },
        center: { opacity: 1, scale: 1, x: '0%' },
        exit: { opacity: 0, scale: 1.01, x: direction > 0 ? '-3%' : '3%' },
      };

  const copyContainer = reduced
    ? undefined
    : {
        enter: {},
        center: {
          transition: { staggerChildren: 0.08, delayChildren: 0.06 },
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
        enter: { opacity: 0, y: 16 },
        center: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
      };

  return (
    <section
      className="relative flex min-h-[78dvh] flex-col overflow-hidden bg-[hsl(var(--hero-plane))] text-white sm:min-h-[82dvh] lg:min-h-[88dvh]"
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
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/20" />
      <div className="relative z-10 mx-auto mt-auto flex w-full max-w-store flex-col justify-end store-gutter pb-16 pt-24 sm:pb-20 md:pb-24">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${slideKey}-copy`}
            className="max-w-3xl"
            variants={copyContainer}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <motion.p
              variants={copyItem}
              transition={{ duration: reduced ? 0.12 : 0.45, ease: MOTION_EASE }}
              className="font-heading text-[clamp(2.75rem,12vw,6.5rem)] leading-[0.88] tracking-tight text-white"
            >
              {brand}
            </motion.p>
            <motion.h1
              variants={copyItem}
              transition={{ duration: reduced ? 0.12 : 0.45, ease: MOTION_EASE }}
              className="mt-5 max-w-2xl text-[clamp(1.15rem,3.2vw,1.65rem)] font-semibold uppercase leading-snug tracking-[0.08em] text-white/95"
            >
              {heading}
            </motion.h1>
            {subheading ? (
              <motion.p
                variants={copyItem}
                transition={{ duration: reduced ? 0.12 : 0.45, ease: MOTION_EASE }}
                className="mt-4 max-w-md text-sm leading-relaxed text-white/75 sm:text-base"
              >
                {subheading}
              </motion.p>
            ) : null}
            <motion.div
              variants={copyItem}
              transition={{ duration: reduced ? 0.12 : 0.45, ease: MOTION_EASE }}
              className="mt-8"
            >
              <Magnetic className="inline-block w-fit">
                <Link
                  href={href}
                  className="store-pill cursor-pointer border border-white/35 bg-white px-7 py-3.5 text-foreground sm:px-9"
                >
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
            className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-black/25 text-white transition-colors hover:bg-black/45 sm:left-4"
            aria-label="Previous banner"
            onClick={() => go(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-black/25 text-white transition-colors hover:bg-black/45 sm:right-4"
            aria-label="Next banner"
            onClick={() => go(1)}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-1 sm:bottom-6 sm:gap-1.5">
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
                    index === active ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
