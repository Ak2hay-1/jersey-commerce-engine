import { z } from 'zod';
import { moneySchema } from './catalog';

export const cartStatusSchema = z.enum(['ACTIVE', 'CONVERTED', 'ABANDONED', 'EXPIRED']);
export const fulfillmentMethodSchema = z.enum(['DELIVERY', 'STORE_PICKUP']);
export const orderSourceSchema = z.enum(['WEBSITE', 'POS', 'WHATSAPP', 'MANUAL']);
export const orderStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'READY',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
  'RETURNED',
  'REFUNDED',
]);
export const discountTypeSchema = z.enum(['NONE', 'FIXED', 'PERCENTAGE']);

export const addCartItemSchema = z.object({
  productVariantId: z.string().trim().min(1).max(128),
  quantity: z.number().int().min(1).max(10_000),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(10_000),
});

export const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(1).max(160),
  phone: z.string().trim().min(1).max(32),
  addressLine1: z.string().trim().min(1).max(200),
  addressLine2: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().min(1).max(120),
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().trim().min(2).max(2).optional(),
});

export const checkoutCustomerSchema = z.object({
  name: z.string().trim().min(1).max(160),
  phone: z.string().trim().max(32).optional(),
  email: z.string().trim().email().max(320).optional(),
});

export const checkoutSchema = z.object({
  fulfillmentMethod: fulfillmentMethodSchema.optional(),
  customer: checkoutCustomerSchema.optional(),
  shippingAddress: shippingAddressSchema.optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const staffCreateOrderItemSchema = z.object({
  productVariantId: z.string().trim().min(1).max(128),
  quantity: z.number().int().min(1).max(10_000),
});

export const staffCreateOrderSchema = z.object({
  source: z.enum(['WHATSAPP', 'MANUAL']),
  customerId: z.string().trim().min(1).max(128).optional(),
  customer: checkoutCustomerSchema.optional(),
  items: z.array(staffCreateOrderItemSchema).min(1),
  fulfillmentMethod: fulfillmentMethodSchema.optional(),
  shippingAddress: shippingAddressSchema.optional(),
  notes: z.string().trim().max(1000).optional(),
  discountType: discountTypeSchema.optional(),
  discountValue: moneySchema.optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
});
