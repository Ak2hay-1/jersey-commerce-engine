'use client';

import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { cn } from '@jersey-commerce/ui';
import type { ProductImageDto } from '@jersey-commerce/types';
import { ProductImage } from './product-image';
import { MOTION_DRAWER, MOTION_EASE, MOTION_TRANSITION } from '../motion/presence';

export function ProductGallery({ images, name }: { images: ProductImageDto[]; name: string }): React.JSX.Element {
  const ordered = useMemo(
    () => [...images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder),
    [images],
  );
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [zoomed, setZoomed] = useState(false);
  const touchX = useRef<number | null>(null);
  const current = ordered[index] ?? ordered[0];
  const reduced = useReducedMotion();
  const multiple = ordered.length > 1;

  function go(delta: number) {
    if (!multiple) {
      return;
    }
    setDirection(delta);
    setIndex((value) => (value + delta + ordered.length) % ordered.length);
  }

  function select(nextIndex: number) {
    if (nextIndex === index) {
      return;
    }
    setDirection(nextIndex > index ? 1 : -1);
    setIndex(nextIndex);
  }

  if (!current) {
    return <div className="aspect-[4/5] w-full rounded-[calc(var(--radius)+4px)] bg-[hsl(var(--surface-1))]" />;
  }

  const slideVariants = reduced
    ? {
        enter: { opacity: 1 },
        center: { opacity: 1 },
        exit: { opacity: 1 },
      }
    : {
        enter: { opacity: 0, x: direction > 0 ? '6%' : '-6%' },
        center: { opacity: 1, x: '0%' },
        exit: { opacity: 0, x: direction > 0 ? '-4%' : '4%' },
      };

  return (
    <div className={cn('flex flex-col gap-3', multiple && 'md:flex-row-reverse md:items-start')}>
      <div
        className="product-card-media relative aspect-[4/5] w-full min-w-0 flex-1 overflow-hidden rounded-[calc(var(--radius)+4px)]"
        onTouchStart={(event) => {
          touchX.current = event.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const start = touchX.current;
          const end = event.changedTouches[0]?.clientX;
          touchX.current = null;
          if (start == null || end == null) {
            return;
          }
          const delta = end - start;
          if (Math.abs(delta) > 40) {
            go(delta < 0 ? 1 : -1);
          }
        }}
      >
        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
          <motion.div
            key={current.id}
            className="absolute inset-0"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduced ? 0.15 : 0.4, ease: MOTION_EASE }}
          >
            <button
              type="button"
              className="absolute inset-0 block cursor-zoom-in"
              onClick={() => setZoomed(true)}
              aria-label="Zoom product image"
            >
              <ProductImage
                src={current.url}
                alt={current.altText ?? name}
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 58vw"
                priority
                fill
              />
            </button>
          </motion.div>
        </AnimatePresence>

        <span className="pointer-events-none absolute right-3 top-3 z-[2] flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur">
          <Expand className="h-4 w-4" aria-hidden />
        </span>

        {multiple ? (
          <>
            <div className="absolute inset-y-0 left-3 z-[2] hidden items-center md:flex">
              <button type="button" className="icon-btn cursor-pointer border-white/20 bg-black/40 text-white backdrop-blur" aria-label="Previous image" onClick={() => go(-1)}>
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>
            <div className="absolute inset-y-0 right-3 z-[2] hidden items-center md:flex">
              <button type="button" className="icon-btn cursor-pointer border-white/20 bg-black/40 text-white backdrop-blur" aria-label="Next image" onClick={() => go(1)}>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="absolute inset-x-0 bottom-3 z-[2] flex justify-center gap-1.5 md:hidden" aria-hidden>
              {ordered.map((image, imageIndex) => (
                <span
                  key={image.id}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    imageIndex === index ? 'w-5 bg-white' : 'w-1.5 bg-white/40',
                  )}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {multiple ? (
        <div className="rail-scroll flex gap-2 overflow-x-auto md:max-h-[min(80vh,46rem)] md:w-20 md:shrink-0 md:flex-col md:overflow-y-auto md:overflow-x-visible">
          {ordered.map((image, imageIndex) => {
            const active = imageIndex === index;
            return (
              <button
                key={image.id}
                type="button"
                onClick={() => select(imageIndex)}
                aria-label={`View image ${imageIndex + 1}`}
                aria-current={active}
                className={cn(
                  'relative aspect-[4/5] w-16 shrink-0 cursor-pointer overflow-hidden rounded-md border-2 transition-all duration-300 md:w-full',
                  active ? 'border-foreground opacity-100' : 'border-transparent opacity-55 hover:opacity-100',
                )}
              >
                <ProductImage src={image.url} alt={image.altText ?? `${name} ${imageIndex + 1}`} className="object-cover" sizes="80px" fill />
              </button>
            );
          })}
        </div>
      ) : null}

      <AnimatePresence>
        {zoomed ? (
          <motion.div
            key="zoom-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
            role="dialog"
            aria-modal="true"
            aria-label="Zoomed product image"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MOTION_TRANSITION}
          >
            <button type="button" className="absolute inset-0 cursor-zoom-out" aria-label="Close zoom" onClick={() => setZoomed(false)} />
            <button
              type="button"
              className="icon-btn absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-20 cursor-pointer border-white/20 text-white"
              aria-label="Close"
              onClick={() => setZoomed(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <motion.div
              className="relative z-10 max-h-[90vh] max-w-full"
              initial={reduced ? { opacity: 1 } : { scale: 0.94, opacity: 0.85 }}
              animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1 }}
              exit={reduced ? { opacity: 1 } : { scale: 0.96, opacity: 0 }}
              transition={reduced ? MOTION_TRANSITION : MOTION_DRAWER}
            >
              <ProductImage
                src={current.url}
                alt={current.altText ?? name}
                className="max-h-[90vh] w-auto max-w-full rounded-lg object-contain"
                sizes="100vw"
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
