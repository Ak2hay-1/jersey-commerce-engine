import { z } from 'zod';
import { INVENTORY_MOVEMENT_TYPES } from '@jersey-commerce/types';

export const inventorySortSchema = z.enum([
  'updatedAt',
  'quantity',
  'available',
  'reserved',
  'sku',
  'product',
]);

export const inventoryAdjustTypeSchema = z.enum(['ADJUSTMENT', 'DAMAGE']);

const reasonSchema = z.string().trim().min(1).max(500);

export const inventoryAdjustSchema = z.object({
  productVariantId: z.string().min(1).max(128),
  quantity: z.number().int().refine((value) => value !== 0, 'Adjustment quantity cannot be zero.'),
  reason: reasonSchema,
  type: inventoryAdjustTypeSchema.optional(),
  referenceType: z.string().trim().min(1).max(64).optional(),
  referenceId: z.string().trim().min(1).max(128).optional(),
});

export const inventoryOpeningStockSchema = z.object({
  productVariantId: z.string().min(1).max(128),
  quantity: z.number().int().min(1),
  reason: reasonSchema,
  reorderLevel: z.number().int().min(0).max(1_000_000).optional(),
});

export const inventoryReserveSchema = z.object({
  quantity: z.number().int().min(1),
  reason: reasonSchema,
  referenceType: z.string().trim().min(1).max(64).optional(),
  referenceId: z.string().trim().min(1).max(128).optional(),
});

export const inventoryReorderLevelSchema = z.object({
  reorderLevel: z.number().int().min(0).max(1_000_000),
});

export const inventoryMovementTypeSchema = z.enum(INVENTORY_MOVEMENT_TYPES);
