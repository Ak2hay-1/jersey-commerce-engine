const TENANT_COOKIE = 'jce_tenant';
const CART_COOKIE = 'jce_cart_token';
const CUSTOMER_COOKIE = 'jce_customer_token';
const ORDER_ACCESS_COOKIE = 'jce_order_access';

export const STORE_COOKIES = {
  tenant: TENANT_COOKIE,
  cart: CART_COOKIE,
  customer: CUSTOMER_COOKIE,
  orderAccess: ORDER_ACCESS_COOKIE,
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
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

/** Persist customer/order tokens as httpOnly cookies via the same-origin session route. */
export async function persistSessionTokens(tokens: { customerToken?: string; orderAccessToken?: string }): Promise<void> {
  await fetch('/api/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(tokens),
  });
}

export async function clearCustomerSession(): Promise<void> {
  await fetch('/api/session', { method: 'DELETE', credentials: 'same-origin' });
}

export function clearBrowserCookie(name: string): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}
