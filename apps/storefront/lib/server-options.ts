import { cookies, headers } from 'next/headers';
import { STORE_COOKIES } from './cookies';
import { defaultTenantSlug, tenantSlugFromHost } from './tenant';
import type { StoreRequestOptions } from './api';

export async function serverTenantOptions(): Promise<StoreRequestOptions> {
  const headerStore = await headers();
  const host = headerStore.get('host');
  const tenantSlug =
    headerStore.get('x-tenant-slug') || tenantSlugFromHost(host) || defaultTenantSlug();
  return { tenantSlug };
}

export async function serverStoreOptions(): Promise<StoreRequestOptions> {
  const cookieStore = await cookies();
  const tenant = await serverTenantOptions();
  return {
    tenantSlug: tenant.tenantSlug || cookieStore.get(STORE_COOKIES.tenant)?.value,
    cartToken: cookieStore.get(STORE_COOKIES.cart)?.value,
    accessToken: cookieStore.get(STORE_COOKIES.customer)?.value,
  };
}
