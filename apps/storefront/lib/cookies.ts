const TENANT_COOKIE = 'jce_tenant';
const CART_COOKIE = 'jce_cart_token';
const CUSTOMER_COOKIE = 'jce_customer_token';

export const STORE_COOKIES = {
  tenant: TENANT_COOKIE,
  cart: CART_COOKIE,
  customer: CUSTOMER_COOKIE,
} as const;

export function readBrowserCookie(name: string): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const [rawName, ...rest] = part.trim().split('=');
    if (rawName === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return undefined;
}

export function writeBrowserCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}

export function clearBrowserCookie(name: string): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}
