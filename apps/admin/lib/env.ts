import { publicEnvSchema } from '@jersey-commerce/config';

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_PORTAL: process.env.NEXT_PUBLIC_PORTAL || undefined,
  NEXT_PUBLIC_DEFAULT_TENANT_SLUG: process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG || undefined,
});

declare global {
  interface Window {
    __JCE_PUBLIC__?: { apiUrl?: string; portal?: string };
  }
}

export type StaffPortal = 'admin' | 'erp' | 'all';

export function getApiUrl(): string {
  const runtime = typeof window !== 'undefined' ? window.__JCE_PUBLIC__?.apiUrl?.trim() : undefined;
  return (runtime || publicEnv.NEXT_PUBLIC_API_URL).replace(/\/$/, '');
}

export function getStaffPortal(): StaffPortal {
  const runtime = typeof window !== 'undefined' ? window.__JCE_PUBLIC__?.portal?.trim() : undefined;
  const value = runtime || publicEnv.NEXT_PUBLIC_PORTAL;
  if (value === 'admin' || value === 'erp' || value === 'all') {
    return value;
  }
  return 'all';
}

export function getDefaultTenantSlug(): string | undefined {
  return publicEnv.NEXT_PUBLIC_DEFAULT_TENANT_SLUG;
}
