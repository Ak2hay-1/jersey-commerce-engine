'use client';

import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import type { CartItemDto } from '@jersey-commerce/types';
import { formatMoney } from '../../lib/format';
import { ProductImage } from '../catalog/product-image';
import { QuantitySelector } from '../ui/quantity-selector';
import { Alert } from '../ui/alert';

export function CartItemRow({
  item,
  currency,
  onQuantity,
  onRemove,
}: {
  item: CartItemDto;
  currency: string;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}): React.JSX.Element {
  return (
    <div className="flex gap-4">
      <Link
        href={`/products/${item.productSlug}`}
        className="relative h-28 w-[5.5rem] shrink-0 overflow-hidden rounded-[var(--radius)] bg-[hsl(var(--surface-2))] sm:h-32 sm:w-[6.5rem]"
      >
        <ProductImage src={item.imageUrl} alt={item.imageAlt ?? item.productName} className="object-cover" sizes="104px" fill />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/products/${item.productSlug}`} className="line-clamp-2 text-sm font-medium leading-snug hover:underline hover:underline-offset-4 sm:text-[15px]">
            {item.productName}
          </Link>
          <p className="tabular shrink-0 font-heading text-lg font-bold leading-none">{formatMoney(item.lineTotal, currency)}</p>
        </div>
        {item.size || item.color ? (
          <div className="flex flex-wrap gap-1.5">
            {item.size ? <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-muted-foreground">Size {item.size}</span> : null}
            {item.color ? <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-muted-foreground">{item.color}</span> : null}
          </div>
        ) : null}
        {item.priceChanged ? (
          <Alert tone="warning">Price updated to {formatMoney(item.currentUnitPrice, currency)}.</Alert>
        ) : null}
        {item.availableQuantity <= 0 ? <Alert tone="danger">This item is no longer available.</Alert> : null}
        {item.availableQuantity > 0 && item.availableQuantity < item.quantity ? (
          <Alert tone="warning">Only {item.availableQuantity} available.</Alert>
        ) : null}
        <div className="mt-auto flex items-center justify-between pt-1">
          <QuantitySelector size="sm" value={item.quantity} max={Math.max(1, item.availableQuantity)} onChange={onQuantity} />
          <button
            type="button"
            aria-label="Remove"
            className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            <span aria-hidden>Remove</span>
          </button>
        </div>
      </div>
    </div>
  );
}
