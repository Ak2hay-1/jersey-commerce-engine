import { z } from 'zod';

const booleanFromString = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === 'boolean') {
      return value;
    }
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  });

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  JWT_ACCESS_EXPIRATION: z.string().min(1).default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().min(1).default('7d'),
  AUTH_RATE_LIMIT: z.coerce.number().int().positive().default(10),
  AUTH_RATE_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  COOKIE_SECURE: booleanFromString.default(false),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  BOOTSTRAP_SECRET: z.string().optional().default(''),
  SECRETS_ENCRYPTION_KEY: z.string().optional().default(''),
  TRUST_PROXY: booleanFromString.default(false),
  BACKUP_ALLOWED_ROOT: z.string().optional().default(''),
  PLATFORM_DOMAIN: z.string().optional().default(''),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),
  NEXT_PUBLIC_DEFAULT_TENANT_SLUG: z.string().min(1).max(64).optional(),
  NEXT_PUBLIC_PLATFORM_DOMAIN: z.string().min(1).max(180).optional(),
  NEXT_PUBLIC_PORTAL: z.enum(['admin', 'erp', 'all']).default('all'),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
