import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, 'Password must be at least 8 characters.')
  .max(PASSWORD_MAX_LENGTH, 'Password must be at most 128 characters.')
  .regex(/[a-z]/, 'Password must include a lowercase letter.')
  .regex(/[A-Z]/, 'Password must include an uppercase letter.')
  .regex(/\d/, 'Password must include a number.')
  .regex(/[^A-Za-z0-9]/, 'Password must include a special character.');

export const emailSchema = z
  .string()
  .trim()
  .min(1)
  .max(320)
  .email()
  .transform((value) => value.toLowerCase());
