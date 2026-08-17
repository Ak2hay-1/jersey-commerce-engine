import { z } from 'zod';

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(180)
  .regex(SLUG_PATTERN, 'Slug must be a lowercase URL-safe value such as india-cricket-jersey.');

export const moneySchema = z
  .union([z.string(), z.number()])
  .transform((value) => (typeof value === 'number' ? String(value) : value.trim()))
  .refine((value) => /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value), {
    message: 'Amount cannot be negative and must have at most 2 decimal places.',
  });

export const barcodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .optional()
  .nullable();

export const skuSchema = z.string().trim().min(1).max(64);

export const catalogStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);
export const variantStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

export const productSortSchema = z.enum([
  'newest',
  'oldest',
  'name',
  'featured',
  'price-asc',
  'price-desc',
]);

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  slug: slugSchema.optional(),
  description: z.string().trim().max(4000).optional().nullable(),
  image: z.string().trim().max(2048).optional().nullable(),
  parentId: z.string().min(1).max(128).optional().nullable(),
  sortOrder: z.number().int().min(0).max(1_000_000).optional(),
  status: catalogStatusSchema.optional(),
});

export const productVariantInputSchema = z.object({
  id: z.string().min(1).max(128).optional(),
  sku: skuSchema.optional(),
  barcode: barcodeSchema,
  size: z.string().trim().max(32).optional().nullable(),
  colour: z.string().trim().max(64).optional().nullable(),
  costPrice: moneySchema,
  sellingPrice: moneySchema,
  compareAtPrice: moneySchema.optional().nullable(),
  weight: z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((value) => (value === undefined || value === null ? value : String(value))),
  status: variantStatusSchema.optional(),
});

export const productInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  slug: slugSchema.optional(),
  description: z.string().trim().max(8000).optional().nullable(),
  shortDescription: z.string().trim().max(500).optional().nullable(),
  brand: z.string().trim().max(120).optional().nullable(),
  categoryId: z.string().min(1).max(128).optional().nullable(),
  status: catalogStatusSchema.optional(),
  featured: z.boolean().optional(),
  seoTitle: z.string().trim().max(160).optional().nullable(),
  seoDescription: z.string().trim().max(320).optional().nullable(),
  variants: z.array(productVariantInputSchema).optional(),
});
