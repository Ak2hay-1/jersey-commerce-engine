'use client';

import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '@jersey-commerce/ui';
import type { ProductImageDto } from '@jersey-commerce/types';
import { ProductImage } from './product-image';
import { MOTION_DRAWER, MOTION_DURATION, MOTION_EASE, MOTION_TRANSITION } from '../motion/presence';

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

  function go(delta: number) {
    if (ordered.length < 2) {
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
    return <div className="aspect-[3/4] w-full bg-muted" />;
  }

  const slideVariants = reduced
    ? {
        enter: { opacity: 1 },
        center: { opacity: 1 },
        exit: { opacity: 1 },
      }
    : {
        enter: { opacity: 0, x: direction > 0 ? '8%' : '-8%' },
        center: { opacity: 1, x: '0%' },
        exit: { opacity: 0, x: direction > 0 ? '-6%' : '6%' },
      };

  return (
    <div className="space-y-3">
      <div
        className="relative overflow-hidden bg-muted"
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
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={current.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduced ? 0.15 : 0.42, ease: MOTION_EASE }}
          >
            <button
              type="button"
              className="block w-full cursor-pointer"
              onClick={() => setZoomed(true)}
              aria-label="Zoom product image"
            >
              <ProductImage
                src={current.url}
                alt={current.altText ?? name}
                className="aspect-[3/4] w-full object-cover md:transition-transform md:duration-700 md:ease-out md:hover:scale-[1.03]"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            </button>
          </motion.div>
        </AnimatePresence>
        {ordered.length > 1 ? (
          <p className="pointer-events-none absolute bottom-3 right-3 bg-background/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
            {index + 1} / {ordered.length}
          </p>
        ) : null}
      </div>
      {ordered.length > 1 ? (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
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
                  'relative h-16 w-14 min-h-11 shrink-0 cursor-pointer overflow-hidden border transition-opacity duration-300',
                  active ? 'border-transparent opacity-100' : 'border-transparent opacity-70 hover:opacity-100',
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="pdp-thumb-ring"
                    className="pointer-events-none absolute inset-0 z-[1] border border-foreground"
                    transition={{ duration: MOTION_DURATION, ease: MOTION_EASE }}
                  />
                ) : null}
                <ProductImage src={image.url} alt={image.altText ?? `${name} ${imageIndex + 1}`} className="h-full w-full object-cover" />
              </button>
            );
          })}
        </div>
      ) : null}
      <AnimatePresence>
        {zoomed ? (
          <motion.div
            key="zoom-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
            role="dialog"
            aria-modal="true"
            aria-label="Zoomed product image"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MOTION_TRANSITION}
          >
            <button type="button" className="absolute inset-0 cursor-pointer" aria-label="Close zoom" onClick={() => setZoomed(false)} />
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
                className="max-h-[90vh] w-auto max-w-full object-contain"
                sizes="100vw"
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
