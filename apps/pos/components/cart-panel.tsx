'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Input } from '@jersey-commerce/ui';
import type { DiscountType, PosCartDto, PosCartItemDto } from '@jersey-commerce/types';
import { formatMoney, statusLabel } from '@/lib/format';

function variantLabel(item: PosCartItemDto): string {
  return [item.size, item.colour].filter(Boolean).join(' · ') || item.sku;
}

export function CartPanel({
  cart,
  canDiscount,
  busy,
  onQuantity,
  onRemove,
  onLineDiscount,
  onCartDiscount,
  onHold,
  onClear,
  onCustomer,
  onPay,
}: {
  cart: PosCartDto | null;
  canDiscount: boolean;
  busy?: boolean;
  onQuantity: (itemId: string, quantity: number) => Promise<void>;
  onRemove: (itemId: string) => Promise<void>;
  onLineDiscount: (itemId: string, discountType: DiscountType, discountValue: string) => Promise<void>;
  onCartDiscount: (discountType: DiscountType, discountValue: string) => Promise<void>;
  onHold: () => Promise<void>;
  onClear: () => Promise<void>;
  onCustomer: () => void;
  onPay: () => void;
}): React.JSX.Element {
  const [cartDiscountType, setCartDiscountType] = useState<DiscountType>('NONE');
  const [cartDiscountValue, setCartDiscountValue] = useState('0.00');

  useEffect(() => {
    if (!cart) {
      return;
    }
    setCartDiscountType((cart.discountType as DiscountType) || 'NONE');
    setCartDiscountValue(cart.discountValue);
  }, [cart]);
  const empty = !cart || cart.items.length === 0;
  const blocked = cart?.items.some((item) => item.stockStatus === 'OUT_OF_STOCK') ?? false;

  return (
    <aside className="flex h-full flex-col rounded-xl border bg-background">
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <div>
          <p className="text-sm font-semibold">Cart</p>
          <p className="text-xs text-muted-foreground">
            {cart?.customer ? cart.customer.name : 'Walk-in'}
            {cart?.items.length ? ` · ${cart.items.length} line(s)` : ''}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-10" onClick={onCustomer}>
          Customer
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {empty ? <p className="py-8 text-center text-sm text-muted-foreground">Scan or search to add items.</p> : null}
        {cart?.items.map((item) => (
          <CartLine
            key={item.id}
            item={item}
            canDiscount={canDiscount}
            busy={busy}
            onQuantity={onQuantity}
            onRemove={onRemove}
            onLineDiscount={onLineDiscount}
          />
        ))}
      </div>
      {canDiscount ? (
        <div className="grid grid-cols-[8rem_1fr_auto] gap-2 border-t p-3">
          <select
            className="h-10 rounded-md border bg-transparent px-2 text-sm"
            value={cartDiscountType}
            onChange={(event) => setCartDiscountType(event.target.value as DiscountType)}
          >
            <option value="NONE">No discount</option>
            <option value="PERCENTAGE">Percent</option>
            <option value="FIXED">Fixed</option>
          </select>
          <Input
            className="h-10"
            inputMode="decimal"
            value={cartDiscountValue}
            onChange={(e) => setCartDiscountValue(e.target.value)}
            disabled={cartDiscountType === 'NONE'}
          />
          <Button
            type="button"
            variant="secondary"
            className="h-10"
            disabled={busy || empty}
            onClick={() => void onCartDiscount(cartDiscountType, cartDiscountType === 'NONE' ? '0.00' : cartDiscountValue)}
          >
            Apply
          </Button>
        </div>
      ) : null}
      <div className="space-y-1 border-t p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatMoney(cart?.subtotal ?? '0.00')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Discount</span>
          <span>{formatMoney(cart?.totalDiscount ?? '0.00')}</span>
        </div>
        <div className="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span>{formatMoney(cart?.total ?? '0.00')}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t p-3">
        <Button type="button" variant="outline" className="h-11" disabled={busy || empty} onClick={() => void onHold()}>
          Hold
        </Button>
        <Button type="button" variant="outline" className="h-11" disabled={busy || empty} onClick={() => void onClear()}>
          Clear
        </Button>
        <Button type="button" className="col-span-2 h-12 text-base" disabled={busy || empty || blocked} onClick={onPay}>
          {blocked ? 'Out of stock in cart' : 'Pay'}
        </Button>
      </div>
    </aside>
  );
}

function CartLine({
  item,
  canDiscount,
  busy,
  onQuantity,
  onRemove,
  onLineDiscount,
}: {
  item: PosCartItemDto;
  canDiscount: boolean;
  busy?: boolean;
  onQuantity: (itemId: string, quantity: number) => Promise<void>;
  onRemove: (itemId: string) => Promise<void>;
  onLineDiscount: (itemId: string, discountType: DiscountType, discountValue: string) => Promise<void>;
}): React.JSX.Element {
  const [discountType, setDiscountType] = useState<DiscountType>((item.discountType as DiscountType) || 'NONE');
  const [discountValue, setDiscountValue] = useState(item.discountValue);

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{item.productName}</p>
          <p className="text-xs text-muted-foreground">{variantLabel(item)}</p>
        </div>
        <Badge variant={item.stockStatus === 'OUT_OF_STOCK' ? 'outline' : 'secondary'}>
          {statusLabel(item.stockStatus)}
        </Badge>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10"
            disabled={busy || item.quantity <= 1}
            onClick={() => void onQuantity(item.id, item.quantity - 1)}
          >
            −
          </Button>
          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10"
            disabled={busy}
            onClick={() => void onQuantity(item.id, item.quantity + 1)}
          >
            +
          </Button>
        </div>
        <p className="font-semibold">{formatMoney(item.lineTotal)}</p>
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void onRemove(item.id)}>
          Remove
        </Button>
      </div>
      {canDiscount ? (
        <div className="mt-2 grid grid-cols-[7rem_1fr_auto] gap-2">
          <select
            className="h-9 rounded-md border bg-transparent px-2 text-xs"
            value={discountType}
            onChange={(event) => setDiscountType(event.target.value as DiscountType)}
          >
            <option value="NONE">None</option>
            <option value="PERCENTAGE">%</option>
            <option value="FIXED">₹</option>
          </select>
          <Input
            className="h-9"
            inputMode="decimal"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            disabled={discountType === 'NONE'}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9"
            disabled={busy}
            onClick={() => void onLineDiscount(item.id, discountType, discountType === 'NONE' ? '0.00' : discountValue)}
          >
            Set
          </Button>
        </div>
      ) : null}
    </div>
  );
}
