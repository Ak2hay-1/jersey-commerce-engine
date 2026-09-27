import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ServerEnv } from '@jersey-commerce/config';

export type InvoiceKind = 'SALE' | 'ORDER' | 'SAMPLE';

export type InvoiceTokenPayload = {
  t: string;
  k: InvoiceKind;
  id: string;
  exp: number;
};

export const INVOICE_LINK_TTL_SECONDS = 7 * 24 * 60 * 60;

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

export function signInvoiceToken(payload: InvoiceTokenPayload, secret: string): string {
  const body = base64url(JSON.stringify(payload));
  const signature = base64url(createHmac('sha256', secret).update(body).digest());
  return `${body}.${signature}`;
}

export function verifyInvoiceToken(
  token: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): InvoiceTokenPayload | null {
  const [body, signature, extra] = token.split('.');
  if (!body || !signature || extra !== undefined) {
    return null;
  }
  const expected = createHmac('sha256', secret).update(body).digest();
  let given: Buffer;
  try {
    given = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as InvoiceTokenPayload;
    if (!payload.t || !payload.id || !['SALE', 'ORDER', 'SAMPLE'].includes(payload.k) || payload.exp < nowSeconds) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

@Injectable()
export class InvoiceLinkService {
  constructor(private readonly config: ConfigService<ServerEnv, true>) {}

  private secret(): string {
    const jwt = this.config.get('JWT_ACCESS_SECRET', { infer: true })?.trim();
    const fallback = this.config.get('SECRETS_ENCRYPTION_KEY', { infer: true })?.trim();
    const secret = jwt || fallback;
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET or SECRETS_ENCRYPTION_KEY is required to sign invoice links.');
    }
    return `invoice-link:${secret}`;
  }

  buildUrl(publicBaseUrl: string, tenantId: string, kind: InvoiceKind, id: string): string {
    const token = signInvoiceToken(
      { t: tenantId, k: kind, id, exp: Math.floor(Date.now() / 1000) + INVOICE_LINK_TTL_SECONDS },
      this.secret(),
    );
    return `${publicBaseUrl.replace(/\/+$/, '')}/api/v1/public/invoices/${token}.pdf`;
  }

  verify(token: string): InvoiceTokenPayload | null {
    return verifyInvoiceToken(token.replace(/\.pdf$/i, ''), this.secret());
  }
}
