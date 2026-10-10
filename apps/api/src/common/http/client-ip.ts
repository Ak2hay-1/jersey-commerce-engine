import { isIP } from 'node:net';
import { safeEqual } from '../crypto/safe-equal';

export const CLIENT_IP_HEADER = 'x-jerzyfy-client-ip';
export const PROXY_SECRET_HEADER = 'x-jerzyfy-proxy-secret';

type RequestLike = {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
};

function header(request: RequestLike, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Client IP for rate limiting and audit. The storefront proxies browser calls
 * through Vercel, so `request.ip` is a shared Vercel egress IP; the storefront
 * forwards the shopper IP with a shared secret that only it knows.
 */
export function resolveClientIp(request: RequestLike, proxySecret = process.env.STOREFRONT_PROXY_SECRET): string | undefined {
  if (proxySecret && proxySecret.length >= 32) {
    const forwarded = header(request, CLIENT_IP_HEADER)?.trim();
    if (forwarded && isIP(forwarded) && safeEqual(header(request, PROXY_SECRET_HEADER), proxySecret)) {
      return forwarded;
    }
  }
  return request.ip;
}
