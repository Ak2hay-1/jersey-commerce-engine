import { z } from 'zod';
import { emailSchema, passwordSchema } from './password';

export const storefrontRegisterSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: emailSchema,
  password: passwordSchema,
  phone: z.string().trim().min(6).max(32).optional(),
});

export const storefrontLoginSchema = z.object({
  email: emailSchema.optional(),
  phone: z.string().trim().min(6).max(32).optional(),
  password: z.string().min(1).max(128),
}).refine((value) => Boolean(value.email || value.phone), {
  message: 'Email or phone is required.',
});

export const storefrontProfileSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  email: emailSchema.optional(),
  phone: z.string().trim().min(6).max(32).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  state: z.string().trim().max(120).nullable().optional(),
  postalCode: z.string().trim().max(20).nullable().optional(),
});

export type StorefrontRegisterInput = z.infer<typeof storefrontRegisterSchema>;
export type StorefrontLoginInput = z.infer<typeof storefrontLoginSchema>;
export type StorefrontProfileInput = z.infer<typeof storefrontProfileSchema>;