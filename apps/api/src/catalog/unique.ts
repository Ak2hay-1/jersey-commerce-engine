import { ConflictException } from '@nestjs/common';
import { Prisma } from '../prisma/client';

export function throwUniqueConflict(error: unknown): never | void {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return;
  }
  const target = Array.isArray(error.meta?.target) ? error.meta.target.map(String) : [String(error.meta?.target ?? '')];
  if (target.some((item) => item.includes('sku'))) {
    throw new ConflictException('A variant with this SKU already exists in this store.');
  }
  if (target.some((item) => item.includes('barcode'))) {
    throw new ConflictException('A variant with this barcode already exists in this store.');
  }
  if (target.some((item) => item.includes('slug'))) {
    throw new ConflictException('A record with this slug already exists in this store.');
  }
  throw new ConflictException('A record with this value already exists.');
}

export function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function normalizeSku(value: string): string {
  return value.trim().toUpperCase();
}

export function normalizeBarcode(value: string | null | undefined): string | null {
  return normalizeOptionalText(value);
}
