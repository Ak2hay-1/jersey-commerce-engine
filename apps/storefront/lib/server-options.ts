import { cookies, headers } from 'next/headers';
import { STORE_COOKIES } from './cookies';
import { defaultTenantSlug, tenantSlugFromHost } from './tenant';
import type { StoreRequestOptions } from './api';

export async function serverStoreOptions(): Promise<StoreRequestOptions> {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const host = headerStore.get('host');
  const tenantSlug =
    headerStore.get('x-tenant-slug') ||
    cookieStore.get(STORE_COOKIES.tenant)?.value ||
    tenantSlugFromHost(host) ||
    defaultTenantSlug();
  return {
    tenantSlug,
    cartToken: cookieStore.get(STORE_COOKIES.cart)?.value,
    accessToken: cookieStore.get(STORE_COOKIES.customer)?.value,
  };
}
