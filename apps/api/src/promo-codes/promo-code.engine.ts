import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import type { PromoDiscountType } from '@jersey-commerce/types';
import { applyDiscount, money, roundMoney } from '../pos/pos-money';

export interface PromoSnapshot {
  status: 'ACTIVE' | 'DISABLED';
  discountType: 'NONE' | 'FIXED' | 'PERCENTAGE';
  discountValue: Prisma.Decimal;
  minSubtotal: Prisma.Decimal | null;
  maxDiscount: Prisma.Decimal | null;
  usageLimit: number | null;
  usageCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
}

export interface ResolvedPromoDiscount {
  discountType: PromoDiscountType;
  discountValue: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
}

export function assertPromoApplicable(promo: PromoSnapshot, subtotal: Prisma.Decimal, now = new Date()): ResolvedPromoDiscount {
  if (promo.status !== 'ACTIVE') {
    throw new BadRequestException('This promo code is no longer active.');
  }
  if (promo.discountType === 'NONE') {
    throw new BadRequestException('This promo code is not valid.');
  }
  if (promo.startsAt && promo.startsAt.getTime() > now.getTime()) {
    throw new BadRequestException('This promo code is not active yet.');
  }
  if (promo.endsAt && promo.endsAt.getTime() < now.getTime()) {
    throw new BadRequestException('This promo code has expired.');
  }
  if (promo.usageLimit != null && promo.usageCount >= promo.usageLimit) {
    throw new BadRequestException('This promo code has reached its usage limit.');
  }
  const merchandise = roundMoney(subtotal);
  if (promo.minSubtotal && merchandise.lt(promo.minSubtotal)) {
    throw new BadRequestException(`This promo requires a subtotal of at least ${promo.minSubtotal.toFixed(2)}.`);
  }
  const applied = applyDiscount(merchandise, promo.discountType, promo.discountValue);
  let amount = applied.discountAmount;
  let discountType: PromoDiscountType = promo.discountType;
  let discountValue = promo.discountValue;
  if (promo.maxDiscount && amount.gt(promo.maxDiscount)) {
    amount = roundMoney(promo.maxDiscount);
    discountType = 'FIXED';
    discountValue = amount;
  }
  if (amount.lte(0)) {
    throw new BadRequestException('This promo code does not apply to the current cart.');
  }
  return { discountType, discountValue, discountAmount: amount };
}

export function generatePromoCode(prefix = 'JFY'): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let token = '';
  for (let index = 0; index < 6; index += 1) {
    token += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  const clean = prefix.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8);
  return `${clean || 'JFY'}-${token}`;
}

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

export { money };
