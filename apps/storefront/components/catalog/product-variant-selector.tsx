'use client';

import type { ReactNode } from 'react';
import { cn } from '@jersey-commerce/ui';
import type { StorefrontVariant } from '@jersey-commerce/types';
import { sortUniqueSizes } from '@jersey-commerce/utils';
import { availabilityLabel } from '../../lib/format';
import { colorToHex } from '../../lib/swatch';

export function ProductVariantSelector({
  variants,
  selectedId,
  onSelect,
  sizeGuide,
}: {
  variants: StorefrontVariant[];
  selectedId?: string;
  onSelect: (variant: StorefrontVariant) => void;
  sizeGuide?: ReactNode;
}): React.JSX.Element {
  const sizes = sortUniqueSizes(variants.map((variant) => variant.size));
  const colours = [...new Set(variants.map((variant) => variant.colour).filter((value): value is string => Boolean(value)))];
  const selected = variants.find((variant) => variant.id === selectedId);

  function selectSize(size: string) {
    const match =
      (selected?.colour
        ? variants.find(
            (variant) =>
              variant.size === size && variant.colour === selected.colour && variant.availability !== 'OUT_OF_STOCK',
          )
        : undefined) ??
      variants.find((variant) => variant.size === size && variant.availability !== 'OUT_OF_STOCK') ??
      variants.find((variant) => variant.size === size);
    if (match) {
      onSelect(match);
    }
  }

  function selectColour(colour: string) {
    const match =
      variants.find((variant) => variant.colour === colour && variant.size === selected?.size && variant.availability !== 'OUT_OF_STOCK') ??
      variants.find((variant) => variant.colour === colour);
    if (match) {
      onSelect(match);
    }
  }

  const status = selected ? (
    <p
      className={cn(
        'flex items-center gap-2 text-sm',
        selected.availability === 'OUT_OF_STOCK'
          ? 'text-muted-foreground'
          : selected.availability === 'LOW_STOCK'
            ? 'text-amber-400'
            : 'text-emerald-400',
      )}
      aria-live="polite"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {availabilityLabel(selected.availability, selected.remaining)}
      {selected.sku ? <span className="text-muted-foreground">· SKU {selected.sku}</span> : null}
    </p>
  ) : sizes.length > 0 && !variants.some((item) => item.availability !== 'OUT_OF_STOCK' && Boolean(item.size)) ? (
    <p className="text-sm text-muted-foreground">All sizes are currently out of stock.</p>
  ) : (
    <p className="text-sm text-muted-foreground">Select a size{colours.length > 1 ? ' and colour' : ''} to add to cart.</p>
  );

  return (
    <div className="space-y-6">
      {colours.length > 0 ? (
        <fieldset>
          <legend className="text-micro text-muted-foreground">
            Colour{selected?.colour ? <span className="ml-2 normal-case tracking-normal text-foreground">{selected.colour}</span> : null}
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {colours.map((colour) => {
              const active = selected?.colour === colour;
              return (
                <button
                  key={colour}
                  type="button"
                  onClick={() => selectColour(colour)}
                  aria-pressed={active}
                  className={cn(
                    'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-4 text-sm transition-colors',
                    active ? 'border-foreground bg-white/[0.06]' : 'border-white/15 hover:border-white/40',
                  )}
                >
                  <span
                    className="h-7 w-7 rounded-full border border-white/20"
                    style={{ backgroundColor: colorToHex(colour) }}
                    aria-hidden
                  />
                  {colour}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}
      {sizes.length > 0 ? (
        <fieldset>
          <div className="flex items-center justify-between">
            <legend className="text-micro text-muted-foreground">
              Size{selected?.size ? <span className="ml-2 normal-case tracking-normal text-foreground">{selected.size}</span> : null}
            </legend>
            {sizeGuide}
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
            {sizes.map((size) => {
              const unavailable = !variants.some(
                (item) =>
                  item.size === size &&
                  item.availability !== 'OUT_OF_STOCK' &&
                  (!selected?.colour || item.colour === selected.colour),
              );
              const active = selected?.size === size;
              return (
                <button
                  key={size}
                  type="button"
                  disabled={unavailable}
                  aria-pressed={active}
                  onClick={() => selectSize(size)}
                  className={cn(
                    'relative h-12 cursor-pointer rounded-md border text-sm font-semibold transition-colors',
                    active
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-white/15 bg-[hsl(var(--surface-1))] hover:border-white/50',
                    unavailable && 'cursor-not-allowed text-muted-foreground/60 line-through hover:border-white/15',
                  )}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}
      {status}
    </div>
  );
}
