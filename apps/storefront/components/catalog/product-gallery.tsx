'use client';

import { useMemo, useRef, useState } from 'react';
import { cn } from '@jersey-commerce/ui';
import type { ProductImageDto } from '@jersey-commerce/types';
import { ProductImage } from './product-image';

export function ProductGallery({ images, name }: { images: ProductImageDto[]; name: string }): React.JSX.Element {
  const ordered = useMemo(
    () => [...images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder),
    [images],
  );
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const touchX = useRef<number | null>(null);
  const current = ordered[index] ?? ordered[0];

  function go(delta: number) {
    if (ordered.length < 2) {
      return;
    }
    setIndex((value) => (value + delta + ordered.length) % ordered.length);
  }

  if (!current) {
    return <div className="aspect-[3/4] w-full bg-muted" />;
  }

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
        <button type="button" className="block w-full" onClick={() => setZoomed(true)} aria-label="Zoom product image">
          <ProductImage
            src={current.url}
            alt={current.altText ?? name}
            className="aspect-[3/4] w-full object-cover md:transition-transform md:duration-300 md:hover:scale-110"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </button>
      </div>
      {ordered.length > 1 ? (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
          {ordered.map((image, imageIndex) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setIndex(imageIndex)}
              aria-label={`View image ${imageIndex + 1}`}
              aria-current={imageIndex === index}
              className={cn(
                'relative h-16 w-14 shrink-0 overflow-hidden border',
                imageIndex === index ? 'border-foreground' : 'border-transparent opacity-70 hover:opacity-100',
              )}
            >
              <ProductImage src={image.url} alt={image.altText ?? `${name} ${imageIndex + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
      {zoomed ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Zoomed product image">
          <button type="button" className="absolute inset-0" aria-label="Close zoom" onClick={() => setZoomed(false)} />
          <ProductImage
            src={current.url}
            alt={current.altText ?? name}
            className="relative z-10 max-h-[90vh] w-auto max-w-full object-contain"
            sizes="100vw"
          />
        </div>
      ) : null}
    </div>
  );
}
