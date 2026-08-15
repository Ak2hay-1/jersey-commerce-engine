'use client';

import { cn } from '@jersey-commerce/ui';
import type { StorefrontVariant } from '@jersey-commerce/types';
import { availabilityLabel } from '../../lib/format';

export function ProductVariantSelector({
  variants,
  selectedId,
  onSelect,
}: {
  variants: StorefrontVariant[];
  selectedId?: string;
  onSelect: (variant: StorefrontVariant) => void;
}): React.JSX.Element {
  const sizes = [...new Set(variants.map((variant) => variant.size).filter((value): value is string => Boolean(value)))];
  const colours = [...new Set(variants.map((variant) => variant.colour).filter((value): value is string => Boolean(value)))];
  const selected = variants.find((variant) => variant.id === selectedId);

  function selectSize(size: string) {
    const match =
      variants.find((variant) => variant.size === size && variant.colour === selected?.colour && variant.availability !== 'OUT_OF_STOCK') ??
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

  return (
    <div className="space-y-5">
      {colours.length > 0 ? (
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Colour</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {colours.map((colour) => (
              <button
                key={colour}
                type="button"
                onClick={() => selectColour(colour)}
                className={cn(
                  'border px-3 py-2 text-sm',
                  selected?.colour === colour ? 'border-foreground bg-foreground text-background' : 'border-input hover:border-foreground',
                )}
              >
                {colour}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
      {sizes.length > 0 ? (
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Size</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {sizes.map((size) => {
              const variant = variants.find((item) => item.size === size && (!selected?.colour || item.colour === selected.colour));
              const unavailable = !variant || variant.availability === 'OUT_OF_STOCK';
              return (
                <button
                  key={size}
                  type="button"
                  disabled={unavailable}
                  onClick={() => selectSize(size)}
                  className={cn(
                    'min-w-12 border px-3 py-2 text-sm',
                    selected?.size === size ? 'border-foreground bg-foreground text-background' : 'border-input hover:border-foreground',
                    unavailable && 'cursor-not-allowed opacity-40',
                  )}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}
      {selected ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {availabilityLabel(selected.availability, selected.remaining)}
          {selected.sku ? <span className="ml-2">SKU {selected.sku}</span> : null}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Select a size{colours.length ? ' and colour' : ''} to add to cart.</p>
      )}
    </div>
  );
}
