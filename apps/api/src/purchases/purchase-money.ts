import { BadRequestException } from '@nestjs/common';
import { Prisma, PurchaseStatus } from '../prisma/client';

export const PAYABLE_PURCHASE_STATUSES: PurchaseStatus[] = [
  PurchaseStatus.ORDERED,
  PurchaseStatus.PARTIALLY_RECEIVED,
  PurchaseStatus.RECEIVED,
];

export function money(value: string | number | Prisma.Decimal): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

export function roundMoney(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export function moneyString(value: Prisma.Decimal | string | number | null | undefined): string {
  if (value == null) {
    return '0.00';
  }
  return roundMoney(money(value)).toFixed(2);
}

export function parseNonNegativeMoney(value: string | number | undefined, field: string): Prisma.Decimal {
  const raw = value == null || value === '' ? '0' : String(value).trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(raw)) {
    throw new BadRequestException(`${field} cannot be negative and must have at most 2 decimal places.`);
  }
  return roundMoney(money(raw));
}

export function lineGross(unitCost: Prisma.Decimal, quantity: number): Prisma.Decimal {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new BadRequestException('Ordered quantity must be a positive integer.');
  }
  if (unitCost.isNegative()) {
    throw new BadRequestException('Unit cost cannot be negative.');
  }
  return roundMoney(unitCost.mul(quantity));
}

export function lineTotal(
  unitCost: Prisma.Decimal,
  quantity: number,
  discount: Prisma.Decimal,
  tax: Prisma.Decimal,
): Prisma.Decimal {
  const gross = lineGross(unitCost, quantity);
  if (discount.isNegative()) {
    throw new BadRequestException('Discount cannot be negative.');
  }
  if (tax.isNegative()) {
    throw new BadRequestException('Tax cannot be negative.');
  }
  if (discount.gt(gross)) {
    throw new BadRequestException('Item discount cannot exceed the line gross.');
  }
  return roundMoney(gross.sub(discount).add(tax));
}

export function purchaseTotals(
  items: Array<{ unitCost: Prisma.Decimal; quantity: number; discount: Prisma.Decimal; tax: Prisma.Decimal }>,
  headerDiscount: Prisma.Decimal,
  headerTax: Prisma.Decimal,
): { subtotal: Prisma.Decimal; discount: Prisma.Decimal; tax: Prisma.Decimal; total: Prisma.Decimal } {
  if (items.length === 0) {
    throw new BadRequestException('A purchase must include at least one item.');
  }
  if (headerDiscount.isNegative()) {
    throw new BadRequestException('Discount cannot be negative.');
  }
  if (headerTax.isNegative()) {
    throw new BadRequestException('Tax cannot be negative.');
  }
  const subtotal = roundMoney(items.reduce((sum, item) => sum.add(lineGross(item.unitCost, item.quantity)), money(0)));
  const itemDiscount = roundMoney(items.reduce((sum, item) => sum.add(item.discount), money(0)));
  const itemTax = roundMoney(items.reduce((sum, item) => sum.add(item.tax), money(0)));
  const discount = roundMoney(itemDiscount.add(headerDiscount));
  const tax = roundMoney(itemTax.add(headerTax));
  if (discount.gt(subtotal)) {
    throw new BadRequestException('Discount cannot exceed the purchase subtotal.');
  }
  return {
    subtotal,
    discount: headerDiscount,
    tax: headerTax,
    total: roundMoney(subtotal.sub(discount).add(tax)),
  };
}

export function remainingQuantity(ordered: number, received: number): number {
  return Math.max(0, ordered - received);
}

export function receivedLineCost(
  lineTotalAmount: Prisma.Decimal,
  orderedQuantity: number,
  receivedQuantity: number,
): Prisma.Decimal {
  if (orderedQuantity <= 0 || receivedQuantity <= 0) {
    return money(0);
  }
  return roundMoney(lineTotalAmount.mul(receivedQuantity).div(orderedQuantity));
}

export function outstandingAmount(total: Prisma.Decimal, paid: Prisma.Decimal): Prisma.Decimal {
  return roundMoney(total.sub(paid));
}

export function statusAfterReceipt(orderedTotal: number, receivedTotal: number): PurchaseStatus {
  if (receivedTotal <= 0) {
    return PurchaseStatus.ORDERED;
  }
  if (receivedTotal < orderedTotal) {
    return PurchaseStatus.PARTIALLY_RECEIVED;
  }
  return PurchaseStatus.RECEIVED;
}
