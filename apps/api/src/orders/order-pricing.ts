import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import type { DiscountType } from '@jersey-commerce/types';
import { applyDiscount, lineGross, money, roundMoney } from '../pos/pos-money';
import { allocateProportional, parseTaxRate, splitTax } from '../finance/tax';

export interface PricedOrderLineInput {
  productVariantId: string;
  productName: string;
  sku: string;
  size: string | null;
  color: string | null;
  quantity: number;
  unitPrice: Prisma.Decimal;
  costPrice: Prisma.Decimal;
  taxRate: Prisma.Decimal;
  taxInclusive: boolean;
}

export interface PricedOrderLine extends PricedOrderLineInput {
  lineGross: Prisma.Decimal;
  discount: Prisma.Decimal;
  tax: Prisma.Decimal;
  pretax: Prisma.Decimal;
  total: Prisma.Decimal;
}

export interface OrderPricingResult {
  lines: PricedOrderLine[];
  subtotal: Prisma.Decimal;
  discount: Prisma.Decimal;
  tax: Prisma.Decimal;
  shippingAmount: Prisma.Decimal;
  total: Prisma.Decimal;
}

export function priceOrderLines(
  items: PricedOrderLineInput[],
  discountType: DiscountType,
  discountValue: Prisma.Decimal,
  shippingAmount: Prisma.Decimal,
): OrderPricingResult {
  if (items.length === 0) {
    throw new BadRequestException('An order must contain at least one item.');
  }
  const grossLines = items.map((item) => {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new BadRequestException('Item quantity must be a positive integer.');
    }
    if (item.unitPrice.lte(0)) {
      throw new BadRequestException('Selling price is not valid.');
    }
    return { ...item, lineGross: lineGross(item.unitPrice, item.quantity) };
  });
  const merchandise = roundMoney(grossLines.reduce((sum, item) => sum.add(item.lineGross), money(0)));
  const cartDiscount = applyDiscount(merchandise, discountType, discountValue);
  const discountShares = allocateProportional(
    grossLines.map((item) => item.lineGross),
    cartDiscount.discountAmount,
  );
  const lines: PricedOrderLine[] = grossLines.map((item, index) => {
    const discount = discountShares[index] ?? money(0);
    const afterDiscount = roundMoney(item.lineGross.sub(discount));
    const split = splitTax(afterDiscount, parseTaxRate(item.taxRate), item.taxInclusive);
    return {
      ...item,
      discount,
      tax: split.tax,
      pretax: split.pretax,
      total: split.total,
    };
  });
  const tax = roundMoney(lines.reduce((sum, line) => sum.add(line.tax), money(0)));
  const shipping = roundMoney(shippingAmount);
  if (shipping.isNegative()) {
    throw new BadRequestException('Shipping amount cannot be negative.');
  }
  const total = roundMoney(cartDiscount.net.add(shipping));
  return {
    lines,
    subtotal: merchandise,
    discount: cartDiscount.discountAmount,
    tax,
    shippingAmount: shipping,
    total,
  };
}
