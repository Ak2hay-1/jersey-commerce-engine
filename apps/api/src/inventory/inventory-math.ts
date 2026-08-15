import { BadRequestException } from '@nestjs/common';
import type { StockStatus } from '@jersey-commerce/types';

export function availableQuantity(quantity: number, reservedQuantity: number): number {
  return quantity - reservedQuantity;
}

export function assertInventoryInvariants(quantity: number, reservedQuantity: number): number {
  if (!Number.isInteger(quantity) || !Number.isInteger(reservedQuantity)) {
    throw new BadRequestException('Stock quantities must be integers.');
  }
  if (quantity < 0) {
    throw new BadRequestException('Stock quantity cannot be negative.');
  }
  if (reservedQuantity < 0) {
    throw new BadRequestException('Reserved quantity cannot be negative.');
  }
  if (reservedQuantity > quantity) {
    throw new BadRequestException('Reserved quantity cannot exceed total quantity.');
  }
  const available = availableQuantity(quantity, reservedQuantity);
  if (available < 0) {
    throw new BadRequestException('Available stock cannot become negative.');
  }
  return available;
}

export function stockStatus(quantity: number, reorderLevel: number): StockStatus {
  if (quantity <= 0) {
    return 'OUT_OF_STOCK';
  }
  if (reorderLevel > 0 && quantity <= reorderLevel) {
    return 'LOW_STOCK';
  }
  return 'IN_STOCK';
}

export type LockedInventoryRow = {
  id: string;
  tenant_id: string;
  product_variant_id: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  reorder_level: number;
};
