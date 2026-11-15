import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ServerEnv } from '@jersey-commerce/config';
import { passwordSchema } from '@jersey-commerce/validation';
import { AuthRateLimiterService } from '../auth/rate-limit/auth-rate-limiter.service';
import { PasswordService } from '../auth/password.service';
import { createOpaqueToken, hashOpaqueToken } from '../common/crypto/token-hash';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { AuthSettingsService } from '../auth-settings/auth-settings.service';
import { EmailSenderService } from '../auth-settings/email-sender.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { normalizeEmail } from '../customers/customer-phone';
import type { RequestMeta } from '../auth/auth-session.service';

const RESET_TTL_SECONDS = 60 * 60;
const GENERIC_OK = {
  sent: true as const,
  message: 'If an account exists for that email, a reset link is on its way.',
};

@Injectable()
export class StorePasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly rateLimit: AuthRateLimiterService,
    private readonly authSettings: AuthSettingsService,
    private readonly email: EmailSenderService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
    private readonly config: ConfigService<ServerEnv, true>,
  ) {}

  async request(tenantId: string, emailRaw: string, meta?: RequestMeta) {
    await this.assertPasswordLogin(tenantId);
    const email = normalizeEmail(emailRaw);
    await this.rateLimit.consume(`store-password-reset:${tenantId}:${email ?? meta?.ipAddress ?? 'unknown'}`);
    if (!email) {
      return GENERIC_OK;
    }

    const customer = await this.prisma.customer.findFirst({
      where: { tenantId, email, status: 'ACTIVE', passwordHash: { not: null } },
      select: { id: true, email: true, name: true },
    });
    if (!customer?.email) {
      return GENERIC_OK;
    }

    const token = createOpaqueToken('cpr_');
    const key = this.redisKey(tenantId, hashOpaqueToken(token));
    await this.redis.getClient().set(key, JSON.stringify({ customerId: customer.id }), 'EX', RESET_TTL_SECONDS);

    const settings = await this.authSettings.getResolved(tenantId);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    const storeName = settings.emailFromName?.trim() || tenant?.name?.trim() || 'Jerzyfy';
    const resetUrl = `${this.storefrontOrigin()}/auth/reset-password?token=${encodeURIComponent(token)}`;
    const expiresInMinutes = Math.round(RESET_TTL_SECONDS / 60);
    await this.email.send(settings, {
      to: customer.email,
      subject: `Reset your ${storeName} password`,
      text: [
        `Hi ${customer.name || 'there'},`,
        '',
        `We received a request to reset your ${storeName} password.`,
        `Open this link within ${expiresInMinutes} minutes:`,
        resetUrl,
        '',
        'If you did not ask for this, you can ignore this email.',
      ].join('\n'),
      html: `<p>Hi ${escapeHtml(customer.name || 'there')},</p>
<p>We received a request to reset your <strong>${escapeHtml(storeName)}</strong> password.</p>
<p><a href="${resetUrl}">Reset your password</a> (expires in ${expiresInMinutes} minutes).</p>
<p>If you did not ask for this, you can ignore this email.</p>`,
    });

    await this.audit.log({
      action: AUDIT_ACTIONS.CUSTOMER_PASSWORD_RESET_REQUESTED,
      tenantId,
      entity: 'Customer',
      entityId: customer.id,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return GENERIC_OK;
  }

  async reset(tenantId: string, token: string, password: string, meta?: RequestMeta) {
    await this.assertPasswordLogin(tenantId);
    await this.rateLimit.consume(`store-password-reset-complete:${tenantId}:${meta?.ipAddress ?? 'unknown'}`);
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Password does not meet requirements.');
    }
    const rawToken = token.trim();
    if (!rawToken) {
      throw new UnauthorizedException('Invalid or expired reset link.');
    }

    const key = this.redisKey(tenantId, hashOpaqueToken(rawToken));
    const raw = await this.redis.getClient().get(key);
    if (!raw) {
      throw new UnauthorizedException('Invalid or expired reset link.');
    }
    let customerId: string | undefined;
    try {
      customerId = (JSON.parse(raw) as { customerId?: string }).customerId;
    } catch {
      customerId = undefined;
    }
    if (!customerId) {
      await this.redis.getClient().del(key);
      throw new UnauthorizedException('Invalid or expired reset link.');
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId, status: 'ACTIVE' },
    });
    if (!customer) {
      await this.redis.getClient().del(key);
      throw new UnauthorizedException('Invalid or expired reset link.');
    }

    const passwordHash = await this.passwords.hash(parsed.data);
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { passwordHash },
    });
    await this.redis.getClient().del(key);

    await this.audit.log({
      action: AUDIT_ACTIONS.CUSTOMER_PASSWORD_RESET_COMPLETED,
      tenantId,
      entity: 'Customer',
      entityId: customer.id,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return { reset: true as const };
  }

  private redisKey(tenantId: string, tokenHash: string): string {
    return `store-password-reset:${tenantId}:${tokenHash}`;
  }

  private storefrontOrigin(): string {
    const configured = process.env.NEXT_PUBLIC_STOREFRONT_URL?.trim();
    if (configured) {
      return configured.replace(/\/$/, '');
    }
    const origins = (this.config.get('CORS_ORIGINS', { infer: true }) ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    const storefront = origins.find((origin) => !/admin|erp|pos/i.test(origin)) ?? origins[0];
    return (storefront || 'https://www.jerzyfy.in').replace(/\/$/, '');
  }

  private async assertPasswordLogin(tenantId: string) {
    const flags = await this.authSettings.getPublicFlags(tenantId);
    if (!flags.passwordLogin) {
      throw new ForbiddenException('Password sign-in is disabled for this store.');
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
