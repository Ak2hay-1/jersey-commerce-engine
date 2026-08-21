import type { AppliedPromoCode, CartDto, CartItemDto, CartTotalsDto } from '@jersey-commerce/types';
import { Prisma } from '../prisma/client';
import { lineGross, money, moneyString } from '../pos/pos-money';
import { availableQuantity } from '../inventory/inventory-math';
import { assertPromoApplicable } from '../promo-codes/promo-code.engine';

export const cartInclude = {
  items: {
    include: {
      productVariant: {
        include: {
          product: {
            include: {
              images: { orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }], take: 1 },
            },
          },
          inventory: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  promoCode: true,
} satisfies Prisma.CartInclude;

export type CartRecord = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

function toItem(item: CartRecord['items'][number], unitPrice: Prisma.Decimal): CartItemDto {
  const onHand = item.productVariant.inventory?.quantity ?? 0;
  const reserved = item.productVariant.inventory?.reservedQuantity ?? 0;
  const currentUnitPrice = money(item.productVariant.sellingPrice.toString());
  const image = item.productVariant.product.images[0];
  return {
    id: item.publicId,
    productVariantId: item.productVariantId,
    productName: item.productVariant.product.name,
    productSlug: item.productVariant.product.slug,
    sku: item.productVariant.sku,
    size: item.productVariant.size,
    color: item.productVariant.color,
    quantity: item.quantity,
    unitPrice: moneyString(unitPrice),
    currentUnitPrice: moneyString(currentUnitPrice),
    lineTotal: moneyString(lineGross(currentUnitPrice, item.quantity)),
    availableQuantity: availableQuantity(onHand, reserved),
    imageUrl: image?.url ?? null,
    imageAlt: image?.altText ?? item.productVariant.product.name,
    priceChanged: moneyString(unitPrice) !== moneyString(currentUnitPrice),
  };
}

export function toCartDto(cart: CartRecord, options?: { cartToken?: string; currency?: string }): CartDto {
  const items = cart.items.map((item) => toItem(item, money(item.unitPrice.toString())));
  const subtotal = items.reduce((sum, item) => sum.add(money(item.lineTotal)), money(0));
  let discount = money(0);
  let promoCode: AppliedPromoCode | null = null;
  if (cart.promoCode) {
    try {
      const resolved = assertPromoApplicable(cart.promoCode, subtotal);
      discount = resolved.discountAmount;
      promoCode = {
        id: cart.promoCode.id,
        code: cart.promoCode.code,
        name: cart.promoCode.name,
        discountType: resolved.discountType,
        discountValue: moneyString(resolved.discountValue) ?? '0.00',
      };
    } catch {
      promoCode = {
        id: cart.promoCode.id,
        code: cart.promoCode.code,
        name: cart.promoCode.name,
        discountType: cart.promoCode.discountType === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED',
        discountValue: moneyString(cart.promoCode.discountValue) ?? '0.00',
      };
    }
  }
  const totals: CartTotalsDto = {
    subtotal: moneyString(subtotal) ?? '0.00',
    discount: moneyString(discount) ?? '0.00',
    tax: moneyString(money(0)) ?? '0.00',
    shippingAmount: moneyString(money(0)) ?? '0.00',
    total: moneyString(subtotal.sub(discount)) ?? '0.00',
    currency: options?.currency ?? 'INR',
  };
  return {
    id: cart.publicId,
    status: cart.status,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    items,
    totals,
    promoCode,
    expiresAt: cart.expiresAt.toISOString(),
    createdAt: cart.createdAt.toISOString(),
    updatedAt: cart.updatedAt.toISOString(),
    cartToken: options?.cartToken,
  };
}
