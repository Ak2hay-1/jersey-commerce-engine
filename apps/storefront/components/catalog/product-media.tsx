'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Box, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { cn } from '@jersey-commerce/ui';
import type { StorefrontProductDetail } from '@jersey-commerce/types';
import { ProductGallery } from './product-gallery';
import { ProductImage } from './product-image';
import { JerseyStage } from '../three/jersey-stage-lazy';
import { designFromProduct } from '../three/jersey-design';
import { MOTION_EASE, MOTION_TRANSITION } from '../motion/presence';
import { colorToHex } from '../../lib/swatch';

type View = 'photos' | '3d';

export function ProductMedia({
  product,
  brand,
}: {
  product: StorefrontProductDetail;
  brand: string;
}): React.JSX.Element {
  const reduced = useReducedMotion();
  const [view, setView] = useState<View>('3d');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('10');
  const [colour, setColour] = useState<string | null>(product.colours[0] ?? null);
  const [showBack, setShowBack] = useState(false);

  const design = useMemo(
    () => ({
      ...designFromProduct({ name: product.name, colours: product.colours, activeColour: colour, crest: brand }),
      name: name.trim() || 'YOUR NAME',
      number: number.trim() || '10',
    }),
    [product.name, product.colours, colour, brand, name, number],
  );

  const primaryImage = product.images.find((image) => image.isPrimary) ?? product.images[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 border border-foreground/10 p-1" role="tablist" aria-label="Product media view">
        {(
          [
            { id: '3d', label: '3D kit', icon: Box },
            { id: 'photos', label: 'Photos', icon: ImageIcon },
          ] as const
        ).map((tab) => {
          const active = view === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn(
                'relative flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors',
                active ? 'text-background' : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setView(tab.id)}
            >
              {active ? (
                <motion.span
                  layoutId="pdp-media-tab"
                  className="absolute inset-0 bg-foreground"
                  transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }}
                />
              ) : null}
              <Icon className="relative h-4 w-4" />
              <span className="relative">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {view === 'photos' ? (
          <motion.div
            key="photos"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={MOTION_TRANSITION}
          >
            <ProductGallery images={product.images} name={product.name} />
          </motion.div>
        ) : (
          <motion.div
            key="3d"
            className="space-y-4"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease: MOTION_EASE }}
          >
            <div
              className="relative overflow-hidden"
              style={{
                background: `radial-gradient(ellipse 70% 60% at 50% 40%, ${design.primary}55 0%, #111 70%, #070707 100%)`,
              }}
            >
              <JerseyStage
                className="aspect-[4/5] w-full cursor-grab active:cursor-grabbing"
                design={design}
                variant="viewer"
                showBack={showBack}
                accent={design.secondary}
                fallback={
                  primaryImage ? (
                    <ProductImage
                      src={primaryImage.url}
                      alt={primaryImage.altText ?? product.name}
                      className="h-full w-full object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      priority
                    />
                  ) : null
                }
              />
              <div className="pointer-events-none absolute left-4 top-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
                Drag to rotate
              </div>
              <button
                type="button"
                className="absolute bottom-4 right-4 flex min-h-11 cursor-pointer items-center gap-2 bg-white/10 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur transition-colors hover:bg-white/20"
                onClick={() => setShowBack((value) => !value)}
              >
                <RotateCcw className="h-4 w-4" />
                {showBack ? 'Show front' : 'Show back'}
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Name preview</span>
                <input
                  value={name}
                  maxLength={12}
                  placeholder="YOUR NAME"
                  className="mt-2 h-11 w-full border border-foreground/15 bg-transparent px-3 text-sm uppercase tracking-[0.12em] outline-none focus:border-foreground"
                  onChange={(event) => {
                    setName(event.target.value.replace(/[^a-zA-Z .'-]/g, ''));
                    setShowBack(true);
                  }}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Number</span>
                <input
                  value={number}
                  inputMode="numeric"
                  maxLength={2}
                  className="mt-2 h-11 w-full border border-foreground/15 bg-transparent px-3 text-center text-sm font-semibold outline-none focus:border-foreground"
                  onChange={(event) => {
                    setNumber(event.target.value.replace(/\D/g, '').slice(0, 2));
                    setShowBack(true);
                  }}
                />
              </label>
            </div>

            {product.colours.length > 1 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Kit colour</span>
                {product.colours.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-label={`Preview ${item}`}
                    aria-pressed={colour === item}
                    className={cn(
                      'h-9 w-9 cursor-pointer rounded-full border-2 transition-transform',
                      colour === item ? 'scale-110 border-foreground' : 'border-transparent hover:scale-105',
                    )}
                    style={{ backgroundColor: colorToHex(item) }}
                    onClick={() => setColour(item)}
                  />
                ))}
              </div>
            ) : null}

            <p className="text-xs text-muted-foreground">
              Live preview only.{' '}
              <Link href="/custom-orders" className="underline underline-offset-4 hover:text-foreground">
                Request a custom kit
              </Link>{' '}
              for printed names and numbers.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
