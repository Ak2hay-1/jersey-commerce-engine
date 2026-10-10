import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { STORE_COOKIES } from './lib/cookies';
import { defaultTenantSlug, isSingleTenantMode, tenantSlugFromHost } from './lib/tenant';

const CLIENT_IP_HEADER = 'x-jerzyfy-client-ip';
const PROXY_SECRET_HEADER = 'x-jerzyfy-proxy-secret';

export function middleware(request: NextRequest): NextResponse {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const singleTenant = isSingleTenantMode();
  const pinned = defaultTenantSlug();
  const requested = singleTenant ? undefined : searchParams.get('tenant')?.trim().toLowerCase();
  const fromHost = singleTenant ? undefined : tenantSlugFromHost(request.headers.get('host'));
  const fromCookie = singleTenant ? undefined : request.cookies.get(STORE_COOKIES.tenant)?.value;
  const slug = requested || fromHost || fromCookie || pinned;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(CLIENT_IP_HEADER);
  requestHeaders.delete(PROXY_SECRET_HEADER);
  const proxySecret = process.env.STOREFRONT_PROXY_SECRET;
  if (proxySecret && pathname.startsWith('/api/v1/')) {
    const clientIp =
      request.headers.get('x-real-ip')?.trim() || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (clientIp) {
      requestHeaders.set(CLIENT_IP_HEADER, clientIp);
      requestHeaders.set(PROXY_SECRET_HEADER, proxySecret);
    }
  }
  if (pathname.startsWith('/api/v1/')) {
    const customerToken = request.cookies.get(STORE_COOKIES.customer)?.value;
    if (customerToken && !requestHeaders.has('authorization')) {
      requestHeaders.set('authorization', `Bearer ${customerToken}`);
    }
    const orderAccessToken = request.cookies.get(STORE_COOKIES.orderAccess)?.value;
    if (orderAccessToken && !requestHeaders.has('x-order-access-token')) {
      requestHeaders.set('x-order-access-token', orderAccessToken);
    }
  }
  if (slug) {
    requestHeaders.set('x-tenant-slug', slug);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (requested) {
    response.cookies.set(STORE_COOKIES.tenant, requested, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
    const clean = request.nextUrl.clone();
    clean.searchParams.delete('tenant');
    const redirect = NextResponse.redirect(clean);
    redirect.cookies.set(STORE_COOKIES.tenant, requested, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
    return redirect;
  }
  if (slug && !request.cookies.get(STORE_COOKIES.tenant)?.value) {
    response.cookies.set(STORE_COOKIES.tenant, slug, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
