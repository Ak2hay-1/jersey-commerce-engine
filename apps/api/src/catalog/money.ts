import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../prisma/client';

const MONEY_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;
const WEIGHT_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/;

export function parseMoney(value: string | number, field: string): Prisma.Decimal {
  const raw = typeof value === 'number' ? String(value) : value.trim();
  if (!MONEY_PATTERN.test(raw)) {
    throw new BadRequestException(`${field} cannot be negative and must have at most 2 decimal places.`);
  }
  return new Prisma.Decimal(raw);
}

export function optionalMoney(value: string | number | null | undefined, field: string): Prisma.Decimal | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return parseMoney(value, field);
}

export function parseWeight(value: string | number | null | undefined, field = 'weight'): Prisma.Decimal | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const raw = typeof value === 'number' ? String(value) : value.trim();
  if (!WEIGHT_PATTERN.test(raw)) {
    throw new BadRequestException(`${field} cannot be negative and must have at most 3 decimal places.`);
  }
  return new Prisma.Decimal(raw);
}

export function assertValidPrices(input: {
  costPrice: Prisma.Decimal;
  sellingPrice: Prisma.Decimal;
  compareAtPrice: Prisma.Decimal | null;
}): void {
  if (input.costPrice.isNegative()) {
    throw new BadRequestException('costPrice cannot be negative.');
  }
  if (input.sellingPrice.isNegative()) {
    throw new BadRequestException('sellingPrice cannot be negative.');
  }
  if (input.compareAtPrice?.isNegative()) {
    throw new BadRequestException('compareAtPrice cannot be negative.');
  }
  if (input.compareAtPrice && input.compareAtPrice.lte(input.sellingPrice)) {
    throw new BadRequestException('compareAtPrice must be greater than sellingPrice.');
  }
}

export function moneyString(value: Prisma.Decimal | { toFixed: (digits: number) => string } | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  return value.toFixed(2);
}

export function decimalString(value: Prisma.Decimal | { toString: () => string } | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  return value.toString();
}
