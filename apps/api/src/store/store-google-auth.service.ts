import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { ServerEnv } from '@jersey-commerce/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { createOpaqueToken } from '../common/crypto/token-hash';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { AuthSettingsService } from '../auth-settings/auth-settings.service';
import { normalizeEmail } from '../customers/customer-phone';
import { StoreAuthService } from './store-auth.service';
import type { RequestMeta } from '../auth/auth-session.service';

type GoogleState = { tenantId: string; origin: string };
type GoogleTicket = { tenantId: string; customerId: string };

@Injectable()
export class StoreGoogleAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly authSettings: AuthSettingsService,
    private readonly storeAuth: StoreAuthService,
    private readonly audit: AuditService,
    private readonly config: ConfigService<ServerEnv, true>,
  ) {}

  async start(tenantId: string, request: Request) {
    const settings = await this.authSettings.getResolved(tenantId);
    if (!settings.googleSignInEnabled || !settings.googleClientId || !settings.googleClientSecret) {
      throw new ForbiddenException('Google Sign-In is disabled for this store.');
    }
    const origin = this.resolveOrigin(request);
    const state = createOpaqueToken('gs_');
    const payload: GoogleState = { tenantId, origin };
    await this.redis.getClient().set(`store-google-state:${state}`, JSON.stringify(payload), 'EX', 600);
    const params = new URLSearchParams({
      client_id: settings.googleClientId,
      redirect_uri: this.callbackUrl(request),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
    return { authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
  }

  async callback(request: Request, code: string | undefined, state: string | undefined): Promise<string> {
    const stored = state ? await this.redis.getClient().get(`store-google-state:${state}`) : null;
    if (stored) {
      await this.redis.getClient().del(`store-google-state:${state}`);
    }
    const parsed = stored ? (JSON.parse(stored) as GoogleState) : null;
    const origin = parsed?.origin ?? this.firstCorsOrigin();
    const fail = `${origin}/auth/login?error=google`;
    if (!code || !parsed) {
      return fail;
    }
    try {
      const settings = await this.authSettings.getResolved(parsed.tenantId);
      if (!settings.googleSignInEnabled || !settings.googleClientId || !settings.googleClientSecret) {
        return fail;
      }
      const tokens = await this.exchangeCode(code, settings.googleClientId, settings.googleClientSecret, request);
      const profile = await this.fetchProfile(tokens.access_token);
      const email = normalizeEmail(profile.email);
      if (!email || !profile.sub || profile.email_verified === false) {
        return fail;
      }
      const customer = await this.upsertGoogleCustomer(parsed.tenantId, {
        subject: profile.sub,
        email,
        name: profile.name || email.split('@')[0] || 'Customer',
      });
      const ticket = createOpaqueToken('gt_');
      const payload: GoogleTicket = { tenantId: parsed.tenantId, customerId: customer.id };
      await this.redis.getClient().set(`store-google-ticket:${ticket}`, JSON.stringify(payload), 'EX', 60);
      await this.audit.log({
        action: AUDIT_ACTIONS.AUTH_GOOGLE_LOGIN,
        tenantId: parsed.tenantId,
        entity: 'Customer',
        entityId: customer.id,
        metadata: { source: 'storefront-google' },
      });
      return `${origin}/auth/google/complete?ticket=${encodeURIComponent(ticket)}`;
    } catch {
      return fail;
    }
  }

  async exchange(tenantId: string, ticket: string, meta?: RequestMeta) {
    const raw = await this.redis.getClient().get(`store-google-ticket:${ticket}`);
    if (!raw) {
      throw new UnauthorizedException('Google sign-in expired. Please try again.');
    }
    await this.redis.getClient().del(`store-google-ticket:${ticket}`);
    const parsed = JSON.parse(raw) as GoogleTicket;
    if (parsed.tenantId !== tenantId) {
      throw new UnauthorizedException('Google sign-in expired. Please try again.');
    }
    const customer = await this.prisma.customer.findFirst({
      where: { id: parsed.customerId, tenantId, status: 'ACTIVE' },
    });
    if (!customer) {
      throw new UnauthorizedException('Google sign-in expired. Please try again.');
    }
    void meta;
    return this.storeAuth.issueSession(tenantId, customer);
  }

  private async upsertGoogleCustomer(tenantId: string, profile: { subject: string; email: string; name: string }) {
    const identity = await this.prisma.customerIdentity.findFirst({
      where: { tenantId, provider: 'GOOGLE', providerSubject: profile.subject },
    });
    if (identity) {
      const customer = await this.prisma.customer.findFirst({ where: { id: identity.customerId, tenantId } });
      if (!customer || customer.status === 'BLOCKED') {
        throw new UnauthorizedException('This account is not available.');
      }
      return customer;
    }
    const customer = await this.storeAuth.findOrCreateOtpCustomer({
      tenantId,
      email: profile.email,
      name: profile.name,
      source: 'storefront-google',
    });
    await this.prisma.customerIdentity.create({
      data: {
        tenantId,
        customerId: customer.id,
        provider: 'GOOGLE',
        providerSubject: profile.subject,
        email: profile.email,
      },
    });
    return customer;
  }

  private async exchangeCode(code: string, clientId: string, clientSecret: string, request: Request) {
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: this.callbackUrl(request),
      grant_type: 'authorization_code',
    });
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) {
      throw new BadRequestException('Google token exchange failed.');
    }
    return (await response.json()) as { access_token: string };
  }

  private async fetchProfile(accessToken: string) {
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new BadRequestException('Google profile lookup failed.');
    }
    return (await response.json()) as { sub?: string; email?: string; name?: string; email_verified?: boolean };
  }

  private callbackUrl(request: Request): string {
    const forwardedProto = headerValue(request.headers['x-forwarded-proto']);
    const forwardedHost = headerValue(request.headers['x-forwarded-host']);
    const proto = forwardedProto?.split(',')[0]?.trim() || request.protocol || 'http';
    const host = forwardedHost || request.get('host') || 'localhost:4000';
    return `${proto}://${host}/api/v1/store/auth/google/callback`;
  }

  private resolveOrigin(request: Request): string {
    const requested = typeof request.query.origin === 'string' ? request.query.origin : undefined;
    const headerOrigin = headerValue(request.headers.origin) ?? refererOrigin(headerValue(request.headers.referer));
    const candidate = requested || headerOrigin;
    const allowed = this.corsOrigins();
    if (candidate && (allowed.includes(candidate) || this.isLocalOrigin(candidate))) {
      return candidate.replace(/\/$/, '');
    }
    if (allowed[0]) {
      return allowed[0];
    }
    throw new BadRequestException('A storefront origin is required for Google Sign-In.');
  }

  private corsOrigins(): string[] {
    return this.config
      .get('CORS_ORIGINS', { infer: true })
      .split(',')
      .map((value) => value.trim().replace(/\/$/, ''))
      .filter(Boolean);
  }

  private firstCorsOrigin(): string {
    return this.corsOrigins()[0] || 'http://localhost:3000';
  }

  private isLocalOrigin(origin: string): boolean {
    return this.config.get('NODE_ENV', { infer: true }) !== 'production' && origin.startsWith('http://localhost:');
  }
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function refererOrigin(referer?: string): string | undefined {
  if (!referer) {
    return undefined;
  }
  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}
