import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { passwordSchema } from '@jersey-commerce/validation';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { TokenService } from '../auth/token.service';
import { AuthRateLimiterService } from '../auth/rate-limit/auth-rate-limiter.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { normalizeEmail, normalizePhone } from '../customers/customer-phone';
import { normalizeOptionalText } from '../catalog/unique';
import { toStorefrontCustomer } from './store-catalog.mapper';
import type { StoreLoginDto, StoreProfileUpdateDto, StoreRegisterDto } from './dto/store-auth.dto';
import type { RequestMeta } from '../auth/auth-session.service';

const INVALID = 'Invalid email or password.';

@Injectable()
export class StoreAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly rateLimit: AuthRateLimiterService,
    private readonly audit: AuditService,
  ) {}

  async register(tenantId: string, dto: StoreRegisterDto, meta?: RequestMeta) {
    await this.rateLimit.consume(`store-register:${tenantId}:${meta?.ipAddress ?? 'unknown'}`);
    const parsed = passwordSchema.safeParse(dto.password);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Password does not meet requirements.');
    }
    const email = normalizeEmail(dto.email);
    const phone = normalizePhone(dto.phone);
    if (!email) {
      throw new BadRequestException('A valid email is required.');
    }
    const existing = await this.prisma.customer.findFirst({
      where: {
        tenantId,
        OR: [{ email }, ...(phone ? [{ phone }] : [])],
      },
    });
    if (existing?.passwordHash) {
      throw new ConflictException('An account with this email already exists.');
    }
    if (existing && existing.status === 'BLOCKED') {
      throw new UnauthorizedException('This account is not available.');
    }
    const passwordHash = await this.passwords.hash(dto.password);
    const customer = existing
      ? await this.prisma.customer.update({
          where: { id: existing.id },
          data: {
            name: dto.name.trim(),
            email,
            phone: phone ?? existing.phone,
            passwordHash,
            status: 'ACTIVE',
          },
        })
      : await this.prisma.customer.create({
          data: {
            tenantId,
            name: dto.name.trim(),
            email,
            phone,
            passwordHash,
            status: 'ACTIVE',
            preference: { create: { tenantId } },
          },
        });
    await this.audit.log({
      action: AUDIT_ACTIONS.CUSTOMER_CREATED,
      tenantId,
      entity: 'Customer',
      entityId: customer.id,
      metadata: { source: 'storefront-register' },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
    return this.issue(tenantId, customer);
  }

  async login(tenantId: string, dto: StoreLoginDto, meta?: RequestMeta) {
    const identifier = normalizeEmail(dto.email) ?? normalizePhone(dto.phone);
    await this.rateLimit.consume(`store-login:${tenantId}:${identifier ?? meta?.ipAddress ?? 'unknown'}`);
    if (!identifier) {
      await this.passwords.dummyVerify(dto.password);
      throw new UnauthorizedException(INVALID);
    }
    const customer = await this.prisma.customer.findFirst({
      where: {
        tenantId,
        OR: [{ email: identifier }, { phone: identifier }],
      },
    });
    if (!customer?.passwordHash || customer.status !== 'ACTIVE') {
      await this.passwords.dummyVerify(dto.password);
      throw new UnauthorizedException(INVALID);
    }
    const ok = await this.passwords.verify(customer.passwordHash, dto.password);
    if (!ok) {
      throw new UnauthorizedException(INVALID);
    }
    return this.issue(tenantId, customer);
  }

  async me(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId, status: 'ACTIVE' },
    });
    if (!customer) {
      throw new UnauthorizedException('Customer authentication required.');
    }
    return toStorefrontCustomer(customer);
  }

  async updateProfile(tenantId: string, customerId: string, dto: StoreProfileUpdateDto) {
    const existing = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId, status: 'ACTIVE' },
    });
    if (!existing) {
      throw new UnauthorizedException('Customer authentication required.');
    }
    const email = dto.email === undefined ? existing.email : normalizeEmail(dto.email);
    const phone = dto.phone === undefined ? existing.phone : normalizePhone(dto.phone);
    if (email && email !== existing.email) {
      const clash = await this.prisma.customer.findFirst({
        where: { tenantId, email, id: { not: existing.id } },
        select: { id: true },
      });
      if (clash) {
        throw new ConflictException('An account with this email already exists.');
      }
    }
    const updated = await this.prisma.customer.update({
      where: { id: existing.id },
      data: {
        name: dto.name === undefined ? existing.name : dto.name.trim(),
        email,
        phone,
        address: dto.address === undefined ? existing.address : normalizeOptionalText(dto.address),
        city: dto.city === undefined ? existing.city : normalizeOptionalText(dto.city),
        state: dto.state === undefined ? existing.state : normalizeOptionalText(dto.state),
        postalCode: dto.postalCode === undefined ? existing.postalCode : normalizeOptionalText(dto.postalCode),
      },
    });
    await this.audit.log({
      action: AUDIT_ACTIONS.CUSTOMER_UPDATED,
      tenantId,
      entity: 'Customer',
      entityId: updated.id,
      metadata: { source: 'storefront-profile' },
    });
    return toStorefrontCustomer(updated);
  }

  private issue(
    tenantId: string,
    customer: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      postalCode: string | null;
    },
  ) {
    const access = this.tokens.signCustomerAccessToken({ customerId: customer.id, tenantId });
    return {
      accessToken: access.token,
      tokenType: 'Bearer' as const,
      expiresIn: access.expiresIn,
      customer: toStorefrontCustomer(customer),
    };
  }
}
