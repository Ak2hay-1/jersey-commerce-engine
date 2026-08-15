import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { STORE_COOKIES } from './lib/cookies';
import { defaultTenantSlug, tenantSlugFromHost } from './lib/tenant';

export function middleware(request: NextRequest): NextResponse {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const requested = searchParams.get('tenant')?.trim().toLowerCase();
  const fromHost = tenantSlugFromHost(request.headers.get('host'));
  const fromCookie = request.cookies.get(STORE_COOKIES.tenant)?.value;
  const slug = requested || fromHost || fromCookie || defaultTenantSlug();

  const requestHeaders = new Headers(request.headers);
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
  if (slug && !fromCookie) {
    response.cookies.set(STORE_COOKIES.tenant, slug, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
