import { z } from 'zod';
import { emailSchema, passwordSchema } from './password';

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
  tenantSlug: z.string().trim().min(1).max(64).optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).max(512).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
