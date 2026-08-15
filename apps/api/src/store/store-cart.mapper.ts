import type { CartDto, CartItemDto, CartTotalsDto } from '@jersey-commerce/types';
import { Prisma } from '../prisma/client';
import { lineGross, money, moneyString } from '../pos/pos-money';
import { availableQuantity } from '../inventory/inventory-math';

export const cartInclude = {
  items: {
    include: {
      productVariant: {
        include: {
          product: true,
          inventory: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.CartInclude;

export type CartRecord = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

function toItem(item: CartRecord['items'][number], unitPrice: Prisma.Decimal): CartItemDto {
  const onHand = item.productVariant.inventory?.quantity ?? 0;
  const reserved = item.productVariant.inventory?.reservedQuantity ?? 0;
  return {
    id: item.publicId,
    productVariantId: item.productVariantId,
    productName: item.productVariant.product.name,
    sku: item.productVariant.sku,
    size: item.productVariant.size,
    color: item.productVariant.color,
    quantity: item.quantity,
    unitPrice: moneyString(unitPrice),
    lineTotal: moneyString(lineGross(unitPrice, item.quantity)),
    availableQuantity: availableQuantity(onHand, reserved),
  };
}

export function toCartDto(cart: CartRecord, options?: { cartToken?: string; currency?: string }): CartDto {
  const items = cart.items.map((item) => toItem(item, money(item.unitPrice.toString())));
  const subtotal = items.reduce((sum, item) => sum.add(money(item.lineTotal)), money(0));
  const totals: CartTotalsDto = {
    subtotal: moneyString(subtotal),
    discount: moneyString(money(0)),
    tax: moneyString(money(0)),
    shippingAmount: moneyString(money(0)),
    total: moneyString(subtotal),
    currency: options?.currency ?? 'INR',
  };
  return {
    id: cart.publicId,
    status: cart.status,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    items,
    totals,
    expiresAt: cart.expiresAt.toISOString(),
    createdAt: cart.createdAt.toISOString(),
    updatedAt: cart.updatedAt.toISOString(),
    cartToken: options?.cartToken,
  };
}
