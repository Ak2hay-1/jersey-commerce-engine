'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight, Facebook, Instagram, Twitter, Youtube } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type {
  HomepageSection,
  StorefrontProductDetail,
  StorefrontProductListItem,
  StorefrontSocialLinks,
  StorefrontVariant,
} from '@jersey-commerce/types';
import { cn } from '@jersey-commerce/ui';
import { ProductImage } from '../catalog/product-image';
import { Magnetic } from '../motion/magnetic';
import { MOTION_EASE, MOTION_TRANSITION } from '../motion/presence';
import { useCart } from '../providers/cart-provider';
import { useStore } from '../providers/store-provider';
import { storeApi } from '../../lib/api';
import { DEMO_HERO_IMAGE, resolveDemoMediaUrl } from '../../lib/demo-media';
import { publicErrorMessage } from '../../lib/errors';
import { formatMoney } from '../../lib/format';
import { colorToHex } from '../../lib/swatch';

const SOCIAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  youtube: Youtube,
};

function socialEntries(links: StorefrontSocialLinks): Array<[string, string]> {
  return Object.entries(links).filter((entry): entry is [string, string] => Boolean(entry[1]?.trim()));
}

function sizesFromVariants(variants: StorefrontVariant[]): string[] {
  return [...new Set(variants.map((item) => item.size).filter((value): value is string => Boolean(value)))];
}

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
  const { addItem, setOpen } = useCart();
  const reduced = useReducedMotion();
  const section =
    store.website.homepage.sections.find((item) => item.type === 'hero') ?? sectionProp;

  const slides = useMemo(() => products.slice(0, 5), [products]);
  const [active, setActive] = useState(0);
  const [detail, setDetail] = useState<StorefrontProductDetail | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColour, setSelectedColour] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = slides.length;
  const product = slides[Math.min(active, Math.max(count - 1, 0))] ?? null;

  useEffect(() => {
    setActive(0);
  }, [slides]);

  useEffect(() => {
    if (!product?.slug) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetail(null);
    setSelectedSize(null);
    setSelectedColour(null);
    setError(null);
    void storeApi
      .product(product.slug)
      .then((next) => {
        if (cancelled) {
          return;
        }
        setDetail(next);
        const sizes = next.sizes.length ? next.sizes : sizesFromVariants(next.variants);
        const firstSize = sizes[0] ?? null;
        setSelectedSize(firstSize);
        setSelectedColour(next.colours[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setDetail(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [product?.slug]);

  const go = useCallback(
    (direction: number) => {
      if (count < 2) {
        return;
      }
      setActive((current) => (current + direction + count) % count);
    },
    [count],
  );

  const sizes = detail?.sizes.length
    ? detail.sizes
    : detail
      ? sizesFromVariants(detail.variants)
      : [];
  const colours = detail?.colours ?? [];

  const matchingVariant = useMemo(() => {
    if (!detail) {
      return null;
    }
    return (
      detail.variants.find(
        (item) =>
          item.availability !== 'OUT_OF_STOCK' &&
          (!selectedSize || item.size === selectedSize) &&
          (!selectedColour || item.colour === selectedColour),
      ) ??
      detail.variants.find(
        (item) => item.availability !== 'OUT_OF_STOCK' && (!selectedSize || item.size === selectedSize),
      ) ??
      null
    );
  }, [detail, selectedSize, selectedColour]);

  const price = matchingVariant?.sellingPrice ?? detail?.lowestPrice ?? product?.lowestPrice ?? null;
  const compareAt =
    matchingVariant?.compareAtPrice ?? detail?.compareAtPrice ?? product?.compareAtPrice ?? null;

  const imageSrc =
    (selectedColour
      ? detail?.images.find((image) => image.altText?.toLowerCase().includes(selectedColour.toLowerCase()))
          ?.url
      : null) ||
    detail?.images[0]?.url ||
    resolveDemoMediaUrl(product?.primaryImage?.url) ||
    resolveDemoMediaUrl(section?.image) ||
    resolveDemoMediaUrl(fallbackImage?.url) ||
    DEMO_HERO_IMAGE;

  const headline =
    section?.heading?.trim() || product?.name || store.tenant.name?.trim() || 'Jerzyfy';
  const body =
    section?.subheading?.trim() ||
    detail?.shortDescription?.trim() ||
    'Match-day kits built for the stands, the street, and every kick-off.';
  const tagline = 'Wear the game. Own the look.';
  const href = product ? `/products/${product.slug}` : section?.ctaHref || '/products';
  const social = socialEntries(store.website.socialLinks);

  async function onCta() {
    if (!matchingVariant || pending) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await addItem(matchingVariant.id, 1);
      setOpen(true);
    } catch (caught) {
      setError(publicErrorMessage(caught, 'Could not add this item.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="home-matchday px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4" aria-label="Homepage hero">
      <div
        className="relative flex min-h-[min(92dvh,56rem)] flex-col overflow-hidden rounded-[1.75rem] text-white sm:rounded-[2rem] lg:min-h-[min(92dvh,58rem)]"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 42%, #5a5a5a 0%, #2e2e2e 45%, #141414 100%)',
        }}
      >
        <div className="relative z-10 grid flex-1 grid-cols-1 gap-8 px-5 pb-8 pt-24 sm:px-8 sm:pt-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:gap-6 lg:px-12 lg:pb-12 lg:pt-28">
          {/* Left copy */}
          <div className="order-1 flex flex-col justify-center lg:order-none">
            {count > 1 ? (
              <div className="mb-5 flex gap-2">
                <button
                  type="button"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-white/5 text-white transition-colors hover:bg-white/15"
                  aria-label="Previous product"
                  onClick={() => go(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-white/5 text-white transition-colors hover:bg-white/15"
                  aria-label="Next product"
                  onClick={() => go(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={product?.id ?? 'empty-copy'}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
                transition={MOTION_TRANSITION}
              >
                <h1 className="max-w-md text-[clamp(2rem,5.5vw,3.75rem)] font-semibold leading-[1.05] tracking-tight text-white">
                  {headline}
                </h1>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70 sm:text-[15px]">{body}</p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-8">
              {matchingVariant ? (
                <Magnetic className="inline-block w-fit">
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.02]"
                    disabled={pending}
                    onClick={() => void onCta()}
                  >
                    {pending ? 'Adding…' : 'Get the look'}
                    <span aria-hidden>→</span>
                  </button>
                </Magnetic>
              ) : (
                <Magnetic className="inline-block w-fit">
                  <Link
                    href={href}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.02]"
                  >
                    {section?.ctaLabel?.trim() || 'Get the look'}
                    <span aria-hidden>→</span>
                  </Link>
                </Magnetic>
              )}
              {error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}
            </div>
          </div>

          {/* Center product */}
          <div className="order-2 flex flex-col items-center justify-center lg:order-none">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${product?.id ?? 'empty'}-${imageSrc}`}
                className="relative w-full max-w-[22rem] sm:max-w-[26rem]"
                initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
                animate={
                  reduced
                    ? { opacity: 1 }
                    : { opacity: 1, scale: 1, y: [0, -10, 0] }
                }
                exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                transition={
                  reduced
                    ? { duration: 0.2 }
                    : {
                        opacity: { duration: 0.35, ease: MOTION_EASE },
                        scale: { duration: 0.35, ease: MOTION_EASE },
                        y: { duration: 5.5, repeat: Infinity, ease: 'easeInOut' },
                      }
                }
              >
                <div className="relative mx-auto aspect-[3/4] w-full">
                  <ProductImage
                    src={imageSrc}
                    alt={product?.primaryImage?.altText ?? product?.name ?? 'Featured jersey'}
                    className="object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)]"
                    sizes="(max-width: 1024px) 80vw, 420px"
                    priority
                    fill
                  />
                </div>
                <div
                  className="mx-auto mt-2 h-6 w-[55%] rounded-[100%] bg-black/50 blur-xl"
                  aria-hidden
                />
              </motion.div>
            </AnimatePresence>
            <p className="mt-4 text-center text-xs tracking-[0.04em] text-white/75 sm:text-sm">{tagline}</p>
          </div>

          {/* Right price / sizes */}
          <div className="order-3 flex flex-col justify-center lg:order-none lg:items-end lg:text-right">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={product?.id ?? 'empty-price'}
                className="w-full max-w-xs lg:ml-auto"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={MOTION_TRANSITION}
              >
                <p className="text-[clamp(2.5rem,6vw,4rem)] font-semibold leading-none tracking-tight text-white">
                  {formatMoney(price, currency) || '—'}
                </p>
                {compareAt && Number(compareAt) > Number(price ?? 0) ? (
                  <p className="mt-2 text-lg text-white/45 line-through">{formatMoney(compareAt, currency)}</p>
                ) : null}

                {sizes.length ? (
                  <div className="mt-8 lg:mt-10">
                    <p className="text-sm text-white/65">Choose your size:</p>
                    <div className="mt-3 flex flex-wrap gap-2 lg:justify-end">
                      {sizes.map((size) => {
                        const available = detail?.variants.some(
                          (item) => item.size === size && item.availability !== 'OUT_OF_STOCK',
                        );
                        const selected = selectedSize === size;
                        return (
                          <button
                            key={size}
                            type="button"
                            disabled={!available}
                            className={cn(
                              'flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border text-sm font-semibold transition-colors',
                              selected
                                ? 'border-white bg-white text-black'
                                : 'border-white/25 bg-white/5 text-white hover:bg-white/15',
                              !available && 'cursor-not-allowed opacity-35',
                            )}
                            onClick={() => setSelectedSize(size)}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {colours.length > 1 ? (
                  <div className="mt-8 flex flex-wrap gap-3 lg:justify-end">
                    {colours.map((colour) => {
                      const selected = selectedColour === colour;
                      return (
                        <button
                          key={colour}
                          type="button"
                          aria-label={`Colour ${colour}`}
                          className={cn(
                            'relative h-16 w-14 cursor-pointer overflow-hidden rounded-xl border transition-transform',
                            selected ? 'border-white scale-105' : 'border-white/20 opacity-80 hover:opacity-100',
                          )}
                          style={{ backgroundColor: colorToHex(colour) }}
                          onClick={() => setSelectedColour(colour)}
                        >
                          <span className="sr-only">{colour}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {social.length ? (
          <div className="absolute bottom-5 left-5 z-10 flex gap-3 sm:bottom-7 sm:left-8">
            {social.map(([key, url]) => {
              const Icon = SOCIAL_ICONS[key];
              if (!Icon) {
                return null;
              }
              return (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/70 transition-colors hover:text-white"
                  aria-label={key}
                >
                  <Icon className="h-4 w-4" />
                </a>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
