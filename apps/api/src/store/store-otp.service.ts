import { randomInt } from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ServerEnv } from '@jersey-commerce/config';
import { AuthRateLimiterService } from '../auth/rate-limit/auth-rate-limiter.service';
import { RedisService } from '../redis/redis.service';
import { hashOpaqueToken } from '../common/crypto/token-hash';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { AuthSettingsService } from '../auth-settings/auth-settings.service';
import { EmailSenderService } from '../auth-settings/email-sender.service';
import { buildOtpEmail, buildOtpSmsText } from '../auth-settings/otp-email.template';
import { SmsSenderService } from '../auth-settings/sms-sender.service';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeEmail, normalizePhone } from '../customers/customer-phone';
import { StoreAuthService } from './store-auth.service';
import type { StoreOtpRequestDto, StoreOtpVerifyDto } from './dto/store-auth.dto';
import type { RequestMeta } from '../auth/auth-session.service';

const MAX_ATTEMPTS = 5;
const INVALID = 'Invalid or expired code.';

type StoredOtp = { hash: string; attempts: number };

@Injectable()
export class StoreOtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly rateLimit: AuthRateLimiterService,
    private readonly authSettings: AuthSettingsService,
    private readonly email: EmailSenderService,
    private readonly sms: SmsSenderService,
    private readonly storeAuth: StoreAuthService,
    private readonly audit: AuditService,
    private readonly config: ConfigService<ServerEnv, true>,
  ) {}

  async request(tenantId: string, dto: StoreOtpRequestDto, meta?: RequestMeta) {
    const settings = await this.authSettings.getResolved(tenantId);
    const identifier = this.identifier(dto);
    await this.rateLimit.consume(`store-otp:${tenantId}:${dto.channel}:${identifier ?? meta?.ipAddress ?? 'unknown'}`);
    if (dto.channel === 'email' && !settings.emailOtpEnabled) {
      throw new ForbiddenException('Email OTP is disabled for this store.');
    }
    if (dto.channel === 'sms' && !settings.smsOtpEnabled) {
      throw new ForbiddenException('SMS OTP is disabled for this store.');
    }
    if (!identifier) {
      throw new BadRequestException(dto.channel === 'email' ? 'A valid email is required.' : 'A valid phone is required.');
    }
    const code = String(randomInt(100000, 1000000));
    const ttl = settings.otpTtlSeconds || 300;
    const payload: StoredOtp = { hash: hashOpaqueToken(code), attempts: 0 };
    await this.redis.getClient().set(`store-otp:${tenantId}:${dto.channel}:${identifier}`, JSON.stringify(payload), 'EX', ttl);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    const storeName = settings.emailFromName?.trim() || tenant?.name?.trim() || 'Your store';
    const expiresInMinutes = Math.max(1, Math.round(ttl / 60));
    if (dto.channel === 'email') {
      const message = buildOtpEmail({ storeName, code, expiresInMinutes });
      await this.email.send(settings, { to: identifier, ...message });
    } else {
      await this.sms.send(settings, { to: identifier, text: buildOtpSmsText({ storeName, code, expiresInMinutes }) });
    }
    await this.audit.log({
      action: AUDIT_ACTIONS.AUTH_OTP_REQUESTED,
      tenantId,
      entity: 'Customer',
      entityId: identifier,
      metadata: { channel: dto.channel },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
    return {
      sent: true as const,
      expiresIn: ttl,
      ...(this.config.get('NODE_ENV', { infer: true }) === 'test' ? { debugCode: code } : {}),
    };
  }

  async verify(tenantId: string, dto: StoreOtpVerifyDto, meta?: RequestMeta) {
    const identifier = this.identifier(dto);
    await this.rateLimit.consume(`store-otp-verify:${tenantId}:${identifier ?? meta?.ipAddress ?? 'unknown'}`);
    const settings = await this.authSettings.getResolved(tenantId);
    if (dto.channel === 'email' && !settings.emailOtpEnabled) {
      throw new ForbiddenException('Email OTP is disabled for this store.');
    }
    if (dto.channel === 'sms' && !settings.smsOtpEnabled) {
      throw new ForbiddenException('SMS OTP is disabled for this store.');
    }
    if (!identifier) {
      throw new UnauthorizedException(INVALID);
    }
    const key = `store-otp:${tenantId}:${dto.channel}:${identifier}`;
    const raw = await this.redis.getClient().get(key);
    if (!raw) {
      throw new UnauthorizedException(INVALID);
    }
    const stored = JSON.parse(raw) as StoredOtp;
    if (stored.attempts >= MAX_ATTEMPTS) {
      await this.redis.getClient().del(key);
      throw new UnauthorizedException(INVALID);
    }
    const code = dto.code.replace(/\D/g, '');
    if (stored.hash !== hashOpaqueToken(code)) {
      stored.attempts += 1;
      const ttl = await this.redis.getClient().ttl(key);
      if (ttl > 0) {
        await this.redis.getClient().set(key, JSON.stringify(stored), 'EX', ttl);
      }
      throw new UnauthorizedException(INVALID);
    }
    await this.redis.getClient().del(key);
    const customer = await this.storeAuth.findOrCreateOtpCustomer({
      tenantId,
      email: dto.channel === 'email' ? identifier : undefined,
      phone: dto.channel === 'sms' ? identifier : undefined,
      name: dto.name,
      source: `storefront-otp-${dto.channel}`,
      meta,
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.AUTH_OTP_VERIFIED,
      tenantId,
      entity: 'Customer',
      entityId: customer.id,
      metadata: { channel: dto.channel },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
    return this.storeAuth.issueSession(tenantId, customer);
  }

  private identifier(dto: StoreOtpRequestDto): string | null {
    return dto.channel === 'email' ? normalizeEmail(dto.email) : normalizePhone(dto.phone);
  }
}
