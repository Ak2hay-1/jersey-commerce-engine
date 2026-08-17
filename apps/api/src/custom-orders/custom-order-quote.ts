import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import { parseMoney } from '../catalog/money';
import { money, roundMoney } from '../pos/pos-money';

export interface QuoteTotalsInput {
  unitPrice: string | number | Prisma.Decimal;
  quantity: number;
  customizationCharges?: string | number | Prisma.Decimal | null;
  discount?: string | number | Prisma.Decimal | null;
  tax?: string | number | Prisma.Decimal | null;
  shippingAmount?: string | number | Prisma.Decimal | null;
  depositRequired?: string | number | Prisma.Decimal | null;
}

export interface QuoteTotals {
  unitPrice: Prisma.Decimal;
  quantity: number;
  customizationCharges: Prisma.Decimal;
  subtotal: Prisma.Decimal;
  discount: Prisma.Decimal;
  tax: Prisma.Decimal;
  shippingAmount: Prisma.Decimal;
  total: Prisma.Decimal;
  depositRequired: Prisma.Decimal;
}

function asMoney(value: string | number | Prisma.Decimal | null | undefined, field: string): Prisma.Decimal {
  if (value == null || value === '') {
    return money(0);
  }
  if (value instanceof Prisma.Decimal) {
    return roundMoney(value);
  }
  return roundMoney(parseMoney(value, field));
}

export function computeQuoteTotals(input: QuoteTotalsInput): QuoteTotals {
  const unitPrice = asMoney(input.unitPrice, 'unitPrice');
  const quantity = input.quantity;
  const customizationCharges = asMoney(input.customizationCharges, 'customizationCharges');
  const discount = asMoney(input.discount, 'discount');
  const tax = asMoney(input.tax, 'tax');
  const shippingAmount = asMoney(input.shippingAmount, 'shippingAmount');
  const merchandise = roundMoney(unitPrice.mul(quantity));
  const subtotal = roundMoney(merchandise.add(customizationCharges));
  const total = roundMoney(subtotal.sub(discount).add(tax).add(shippingAmount));
  if (total.isNegative()) {
    throw new BadRequestException('Quote total cannot be negative.');
  }
  const depositRequired = asMoney(input.depositRequired, 'depositRequired');
  if (depositRequired.gt(total)) {
    throw new BadRequestException('Deposit cannot exceed the quote total.');
  }
  return {
    unitPrice,
    quantity,
    customizationCharges,
    subtotal,
    discount,
    tax,
    shippingAmount,
    total,
    depositRequired,
  };
}

export function computeCustomizationCharge(input: {
  pricingType: 'FIXED' | 'PER_ITEM' | 'PERCENTAGE';
  price: Prisma.Decimal;
  quantity: number;
  baseAmount: Prisma.Decimal;
}): Prisma.Decimal {
  if (input.pricingType === 'FIXED') {
    return roundMoney(input.price);
  }
  if (input.pricingType === 'PER_ITEM') {
    return roundMoney(input.price.mul(input.quantity));
  }
  return roundMoney(input.baseAmount.mul(input.price).div(100));
}

export function derivePaymentState(input: {
  total: Prisma.Decimal;
  paid: Prisma.Decimal;
  depositRequired: Prisma.Decimal;
  depositPaid: Prisma.Decimal;
}): 'UNPAID' | 'DEPOSIT_RECEIVED' | 'PARTIALLY_PAID' | 'PAID' {
  const paid = roundMoney(input.paid);
  const total = roundMoney(input.total);
  if (paid.lte(0)) {
    return 'UNPAID';
  }
  if (total.gt(0) && paid.gte(total)) {
    return 'PAID';
  }
  const depositRequired = roundMoney(input.depositRequired);
  const depositPaid = roundMoney(input.depositPaid);
  if (depositRequired.gt(0) && depositPaid.gte(depositRequired) && paid.lt(total)) {
    return depositPaid.eq(paid) ? 'DEPOSIT_RECEIVED' : 'PARTIALLY_PAID';
  }
  return 'PARTIALLY_PAID';
}
