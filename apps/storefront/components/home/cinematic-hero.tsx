'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { HomepageBannerSlide, HomepageSection, StorefrontProductListItem } from '@jersey-commerce/types';
import { Magnetic } from '../motion/magnetic';
import { ProductImage } from '../catalog/product-image';
import { resolveDemoMediaUrl } from '../../lib/demo-media';
import { MOTION_EASE } from '../motion/presence';

const AUTOPLAY_MS = 5500;
const SLIDE_MS = 0.7;

function slidesFromSection(
  section?: HomepageSection,
  fallbackImage?: StorefrontProductListItem['primaryImage'],
): HomepageBannerSlide[] {
  if (section?.slides?.length) {
    return section.slides.filter((slide) => slide.image);
  }
  const image = section?.image || fallbackImage?.url;
  if (!image && !section?.heading && !section?.subheading) {
    return [];
  }
  return [
    {
      image: image ?? '',
      heading: section?.heading?.trim() || 'New collection launched',
      subheading: section?.subheading,
      ctaLabel: section?.ctaLabel || 'Shop the drop',
      ctaHref: section?.ctaHref || '/products',
    },
  ];
}

export function CinematicHero({
  section,
  fallbackImage,
}: {
  section?: HomepageSection;
  fallbackImage?: StorefrontProductListItem['primaryImage'];
}): React.JSX.Element {
  const reduced = useReducedMotion();
  const slides = useMemo(() => slidesFromSection(section, fallbackImage), [section, fallbackImage]);
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const count = slides.length;

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
  const heading = slide?.heading?.trim() || 'New collection launched';
  const subheading = slide?.subheading;
  const href = slide?.ctaHref || '/products';
  const label = slide?.ctaLabel || 'Shop the drop';
  const slideKey = slide?.id ?? `${slide?.image ?? 'empty'}-${active}`;

  const imageVariants = reduced
    ? {
        enter: { opacity: 1 },
        center: { opacity: 1 },
        exit: { opacity: 1 },
      }
    : {
        enter: { opacity: 0, scale: 1.04, x: direction > 0 ? '6%' : '-6%' },
        center: { opacity: 1, scale: 1, x: '0%' },
        exit: { opacity: 0, scale: 1.02, x: direction > 0 ? '-4%' : '4%' },
      };

  const copyVariants = reduced
    ? {
        enter: { opacity: 1 },
        center: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        enter: { opacity: 0, y: 18 },
        center: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -12 },
      };

  return (
    <section
      className="relative flex min-h-[20rem] flex-col overflow-hidden bg-[#111] text-white sm:min-h-[26rem] lg:min-h-[32rem]"
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
          transition={{ duration: SLIDE_MS, ease: MOTION_EASE }}
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
            <div className="absolute inset-0 bg-[#111]" />
          )}
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
      <div className="relative z-10 mx-auto mt-auto flex w-full max-w-store flex-col justify-end store-gutter pb-12 pt-16 sm:pb-10 md:pb-12">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${slideKey}-copy`}
            variants={copyVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduced ? 0.15 : 0.45, ease: MOTION_EASE }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/80">{heading}</p>
            {subheading ? (
              <h1 className="mt-3 max-w-4xl break-words font-heading text-[clamp(1.85rem,8vw,4.5rem)] uppercase leading-[0.92] tracking-tight md:text-6xl lg:text-7xl">
                {subheading}
              </h1>
            ) : (
              <h1 className="mt-3 font-heading text-[clamp(2rem,10vw,3.75rem)] uppercase leading-[0.9] md:text-6xl">Jerzyfy</h1>
            )}
            <Magnetic className="mt-6 inline-block w-fit">
              <Link href={href} className="store-pill border border-white/40 bg-white px-6 py-3 text-foreground sm:px-8">
                {label}
              </Link>
            </Magnetic>
          </motion.div>
        </AnimatePresence>
      </div>
      {count > 1 ? (
        <>
          <button
            type="button"
            className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/30 text-white sm:left-3"
            aria-label="Previous banner"
            onClick={() => go(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/30 text-white sm:right-3"
            aria-label="Next banner"
            onClick={() => go(1)}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1 sm:bottom-4 sm:gap-2">
            {slides.map((item, index) => (
              <button
                key={item.id ?? `${item.image}-${index}`}
                type="button"
                aria-label={`Show banner ${index + 1}`}
                aria-current={index === active}
                className={`h-11 w-11 rounded-full p-3 ${index === active ? 'text-white' : 'text-white/40'}`}
                onClick={() => goTo(index)}
              >
                <span className={`block h-2 w-2 rounded-full ${index === active ? 'bg-white' : 'bg-white/40'}`} />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
