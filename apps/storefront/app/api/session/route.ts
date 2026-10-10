import { NextResponse, type NextRequest } from 'next/server';
import { STORE_COOKIES } from '../../../lib/cookies';

const THIRTY_DAYS = 30 * 24 * 60 * 60;
const TOKEN_PATTERN = /^[A-Za-z0-9._~+/=-]{16,2048}$/;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) {
    return false;
  }
  try {
    const host = new URL(origin).host;
    return host === request.headers.get('x-forwarded-host') || host === request.headers.get('host');
  } catch {
    return false;
  }
}

/** Stores customer and order tokens as httpOnly cookies so page scripts can never read them. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!sameOrigin(request)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { customerToken?: unknown; orderAccessToken?: unknown } | null;
  const response = NextResponse.json({ ok: true });
  if (typeof body?.customerToken === 'string' && TOKEN_PATTERN.test(body.customerToken)) {
    response.cookies.set(STORE_COOKIES.customer, body.customerToken, cookieOptions(THIRTY_DAYS));
  }
  if (typeof body?.orderAccessToken === 'string' && TOKEN_PATTERN.test(body.orderAccessToken)) {
    response.cookies.set(STORE_COOKIES.orderAccess, body.orderAccessToken, cookieOptions(THIRTY_DAYS));
  }
  return response;
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (!sameOrigin(request)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(STORE_COOKIES.customer, '', cookieOptions(0));
  return response;
}
