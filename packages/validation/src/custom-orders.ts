import { z } from 'zod';
import { moneySchema } from './catalog';

export const customOrderTypeSchema = z.enum([
  'CUSTOM_JERSEY',
  'TEAM_ORDER',
  'CORPORATE_ORDER',
  'COLLEGE_ORDER',
  'TOURNAMENT_ORDER',
  'BULK_ORDER',
]);

export const customOrderItemModeSchema = z.enum(['PLAYER_LIST', 'SIZE_QUANTITY']);

export const customizationPricingTypeSchema = z.enum(['FIXED', 'PER_ITEM', 'PERCENTAGE']);

export const customOrderInquirySchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    phone: z.string().trim().min(6).max(32).optional(),
    email: z.string().trim().email().max(320).optional(),
    teamName: z.string().trim().max(160).optional(),
    quantity: z.coerce.number().int().min(1).max(10_000).optional(),
    type: customOrderTypeSchema.optional(),
    preferredJerseyType: z.string().trim().max(120).optional(),
    preferredColours: z.string().trim().max(200).optional(),
    requiredDate: z.string().trim().max(40).optional(),
    customizationRequirements: z.string().trim().max(4000).optional(),
    description: z.string().trim().max(4000).optional(),
    notes: z.string().trim().max(4000).optional(),
  })
  .refine((value) => Boolean(value.phone || value.email), {
    message: 'Provide a phone number or email.',
  });

export const customOrderItemInputSchema = z
  .object({
    productVariantId: z.string().trim().min(1).max(128).optional(),
    lineType: customOrderItemModeSchema,
    playerName: z.string().trim().max(120).optional(),
    jerseyNumber: z.string().trim().max(8).optional(),
    size: z.string().trim().max(20).optional(),
    colour: z.string().trim().max(80).optional(),
    quantity: z.coerce.number().int().min(1).max(10_000),
    unitPrice: moneySchema.optional(),
    customizationFee: moneySchema.optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((value) => value.lineType !== 'PLAYER_LIST' || Boolean(value.playerName?.trim()), {
    message: 'Player list lines require a player name.',
  })
  .refine((value) => value.lineType !== 'SIZE_QUANTITY' || Boolean(value.size?.trim()), {
    message: 'Size quantity lines require a size.',
  });

export const customOrderQuoteInputSchema = z.object({
  unitPrice: moneySchema,
  quantity: z.coerce.number().int().min(1).max(10_000).optional(),
  customizationCharges: moneySchema.optional(),
  discount: moneySchema.optional(),
  tax: moneySchema.optional(),
  shippingAmount: moneySchema.optional(),
  depositRequired: moneySchema.optional(),
  estimatedCompletionDate: z.string().trim().max(40).optional(),
  expiresAt: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(4000).optional(),
  send: z.boolean().optional(),
});

export const customizationOptionInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  pricingType: customizationPricingTypeSchema,
  price: moneySchema,
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  sortOrder: z.coerce.number().int().min(0).max(10_000).optional(),
});

export type CustomOrderInquiryInput = z.infer<typeof customOrderInquirySchema>;
export type CustomOrderItemInput = z.infer<typeof customOrderItemInputSchema>;
export type CustomOrderQuoteInput = z.infer<typeof customOrderQuoteInputSchema>;
