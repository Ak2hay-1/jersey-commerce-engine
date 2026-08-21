'use client';

import Link from 'next/link';
import type { CartItemDto } from '@jersey-commerce/types';
import { Button } from '@jersey-commerce/ui';
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
  const variant = [item.size, item.color].filter(Boolean).join(' / ');
  return (
    <div className="flex gap-3">
      <Link href={`/products/${item.productSlug}`} className="shrink-0">
        <ProductImage src={item.imageUrl} alt={item.imageAlt ?? item.productName} className="h-24 w-20 object-cover" />
      </Link>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link href={`/products/${item.productSlug}`} className="break-words font-heading uppercase tracking-wide">
              {item.productName}
            </Link>
            {variant ? <p className="text-xs text-muted-foreground">{variant}</p> : null}
          </div>
          <p className="shrink-0 text-sm font-medium">{formatMoney(item.lineTotal, currency)}</p>
        </div>
        {item.priceChanged ? (
          <Alert tone="warning">Price updated to {formatMoney(item.currentUnitPrice, currency)}.</Alert>
        ) : null}
        {item.availableQuantity <= 0 ? <Alert tone="danger">This item is no longer available.</Alert> : null}
        {item.availableQuantity > 0 && item.availableQuantity < item.quantity ? (
          <Alert tone="warning">Only {item.availableQuantity} available.</Alert>
        ) : null}
        <div className="flex items-center justify-between pt-1">
          <QuantitySelector value={item.quantity} max={Math.max(1, item.availableQuantity)} onChange={onQuantity} />
          <Button type="button" variant="ghost" className="h-8 px-2 text-xs" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}
