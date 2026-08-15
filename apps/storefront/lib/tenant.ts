import { publicEnv } from './env';
import { STORE_COOKIES, readBrowserCookie } from './cookies';

export function defaultTenantSlug(): string | undefined {
  return publicEnv.NEXT_PUBLIC_DEFAULT_TENANT_SLUG || (process.env.NODE_ENV === 'development' ? 'demo-jersey-store' : undefined);
}

export function tenantSlugFromHost(host: string | null | undefined): string | undefined {
  if (!host) {
    return undefined;
  }
  const hostname = host.split(':')[0]?.toLowerCase();
  if (!hostname) {
    return undefined;
  }
  const platform = publicEnv.NEXT_PUBLIC_PLATFORM_DOMAIN?.toLowerCase();
  if (platform && hostname.endsWith(`.${platform}`) && hostname !== platform) {
    const slug = hostname.slice(0, -(platform.length + 1));
    if (slug && !slug.includes('.')) {
      return slug;
    }
  }
  if (hostname.endsWith('.localhost') && hostname !== 'localhost') {
    return hostname.replace(/\.localhost$/, '');
  }
  return undefined;
}

export function resolveClientTenantSlug(): string | undefined {
  return readBrowserCookie(STORE_COOKIES.tenant) || defaultTenantSlug();
}
