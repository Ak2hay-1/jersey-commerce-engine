import { Prisma } from '../prisma/client';
import type { DiscountType } from '@jersey-commerce/types';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { AuthPrincipal } from '../common/context/request-context';
import type { PermissionCode } from '@jersey-commerce/types';

export function money(value: string | number | Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export function moneyString(value: Prisma.Decimal | { toFixed: (digits: number) => string } | null | undefined): string {
  if (value == null) {
    return '0.00';
  }
  return value.toFixed(2);
}

export function roundMoney(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export function lineGross(unitPrice: Prisma.Decimal, quantity: number): Prisma.Decimal {
  return roundMoney(unitPrice.mul(quantity));
}

export function applyDiscount(
  base: Prisma.Decimal,
  type: DiscountType,
  value: Prisma.Decimal,
): { discountAmount: Prisma.Decimal; net: Prisma.Decimal } {
  if (value.isNegative()) {
    throw new BadRequestException('Discount cannot be negative.');
  }
  const roundedBase = roundMoney(base);
  if (type === 'NONE' || value.isZero()) {
    return { discountAmount: money(0), net: roundedBase };
  }
  if (type === 'PERCENTAGE') {
    if (value.lt(0) || value.gt(100)) {
      throw new BadRequestException('Percentage discount must be between 0 and 100.');
    }
    const discountAmount = roundMoney(roundedBase.mul(value).div(100));
    if (discountAmount.gt(roundedBase)) {
      throw new BadRequestException('Discount cannot exceed the applicable amount.');
    }
    return { discountAmount, net: roundMoney(roundedBase.sub(discountAmount)) };
  }
  const discountAmount = roundMoney(value);
  if (discountAmount.gt(roundedBase)) {
    throw new BadRequestException('Discount cannot exceed the applicable amount.');
  }
  return { discountAmount, net: roundMoney(roundedBase.sub(discountAmount)) };
}

/**
 * Maximum discount limits per role will be loaded from tenant settings in a later phase.
 * Cashiers are denied by missing `sales.discount`; owners and managers are not capped here.
 */
export function assertDiscountPermission(actor: AuthPrincipal, type: DiscountType, value: Prisma.Decimal): void {
  if (type === 'NONE' || value.isZero()) {
    return;
  }
  assertPosPermission(actor, 'sales.discount', 'You do not have permission to apply discounts.');
}

export function assertPosPermission(actor: AuthPrincipal, code: PermissionCode, message: string): void {
  if (!actor.permissions.includes(code)) {
    throw new ForbiddenException(message);
  }
}

export function canViewAllPosData(actor: AuthPrincipal): boolean {
  return actor.roles.includes('OWNER') || actor.roles.includes('MANAGER');
}

export function expectedCash(
  openingCash: Prisma.Decimal,
  cashSales: Prisma.Decimal,
  cashRefunds: Prisma.Decimal,
): Prisma.Decimal {
  const next = roundMoney(openingCash.add(cashSales).sub(cashRefunds));
  if (next.isNegative()) {
    throw new BadRequestException('Expected cash cannot be negative.');
  }
  return next;
}

export function normalizeDiscount(
  type: DiscountType | undefined,
  value: string | number | Prisma.Decimal | undefined,
): { type: DiscountType; value: Prisma.Decimal } {
  const resolvedType = type ?? 'NONE';
  const resolvedValue = money(value ?? 0);
  if (resolvedType === 'NONE') {
    return { type: 'NONE', value: money(0) };
  }
  if (resolvedValue.isZero()) {
    return { type: 'NONE', value: money(0) };
  }
  return { type: resolvedType, value: resolvedValue };
}
