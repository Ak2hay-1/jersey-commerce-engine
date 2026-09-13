import { publicEnvSchema } from '@jersey-commerce/config';

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_DEFAULT_TENANT_SLUG: process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG || undefined,
  NEXT_PUBLIC_SINGLE_TENANT: process.env.NEXT_PUBLIC_SINGLE_TENANT,
});

declare global {
  interface Window {
    __JCE_PUBLIC__?: { apiUrl?: string };
  }
}

export function getApiUrl(): string {
  const runtime = typeof window !== 'undefined' ? window.__JCE_PUBLIC__?.apiUrl?.trim() : undefined;
  return (runtime || publicEnv.NEXT_PUBLIC_API_URL).replace(/\/$/, '');
}

export function getDefaultTenantSlug(): string | undefined {
  return publicEnv.NEXT_PUBLIC_DEFAULT_TENANT_SLUG;
}

export function isSingleTenantMode(): boolean {
  return publicEnv.NEXT_PUBLIC_SINGLE_TENANT !== false;
}
