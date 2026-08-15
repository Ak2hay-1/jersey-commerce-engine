import { z } from 'zod';
import { CUSTOMER_STATUSES, CUSTOMER_TOP_SORTS } from '@jersey-commerce/types';

export const customerStatusSchema = z.enum(CUSTOMER_STATUSES);
export const customerTopSortSchema = z.enum(CUSTOMER_TOP_SORTS);

export const customerPreferenceSchema = z.object({
  emailOptIn: z.boolean().optional(),
  smsOptIn: z.boolean().optional(),
  whatsappOptIn: z.boolean().optional(),
});

export const customerInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  phone: z.string().trim().max(32).optional().nullable(),
  email: z.string().trim().email().max(320).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  state: z.string().trim().max(120).optional().nullable(),
  postalCode: z.string().trim().max(20).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  status: customerStatusSchema.optional(),
  preference: customerPreferenceSchema.optional(),
  allowDuplicate: z.boolean().optional(),
});

export const customerNoteInputSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export const customerTagInputSchema = z
  .object({
    tagId: z.string().trim().min(1).max(128).optional(),
    name: z.string().trim().min(1).max(80).optional(),
  })
  .refine((value) => Boolean(value.tagId || value.name), {
    message: 'Provide tagId or name.',
  });
