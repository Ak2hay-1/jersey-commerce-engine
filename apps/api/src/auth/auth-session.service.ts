import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthMeResponse, AuthTokenResponse, LoginTenantOption } from '@jersey-commerce/types';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { AuthRateLimiterService } from './rate-limit/auth-rate-limiter.service';
import { GENERIC_AUTH_ERROR, REFRESH_COOKIE_NAME } from './auth.constants';
import type { LoginDto } from './dto/login.dto';
import type { RefreshDto } from './dto/refresh.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import {
  isUserAllowedToAuthenticate,
  permissionsFromUser,
  rolesFromUser,
  toAuthUser,
  toTenantSummary,
  userAuthInclude,
  type UserWithAuth,
} from '../users/user.mapper';
import type { AuthPrincipal } from '../common/context/request-context';

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
    private readonly rateLimiter: AuthRateLimiterService,
  ) {}

  async login(dto: LoginDto, meta: RequestMeta): Promise<AuthTokenResponse> {
    const email = dto.email.trim().toLowerCase();
    await this.rateLimiter.consume(`login:ip:${meta.ipAddress ?? 'unknown'}`);
    await this.rateLimiter.consume(`login:email:${email}:${meta.ipAddress ?? 'unknown'}`);
    const users = await this.prisma.withoutTenantScope(async () =>
      this.prisma.user.findMany({
        where: {
          email,
          ...(dto.tenantSlug ? { tenant: { slug: dto.tenantSlug.trim().toLowerCase() } } : {}),
        },
        include: userAuthInclude,
      }),
    );
    const user = users.length === 1 ? (users[0] as UserWithAuth) : undefined;
    if (!user || !isUserAllowedToAuthenticate(user)) {
      if (user) {
        await this.passwords.verify(user.passwordHash, dto.password);
      } else {
        await this.passwords.dummyVerify(dto.password);
      }
      await this.audit.log({
        action: AUDIT_ACTIONS.AUTH_LOGIN_FAILURE,
        tenantId: user?.tenantId,
        userId: user?.id,
        entity: 'User',
        entityId: user?.id ?? 'unknown',
        metadata: { reason: user ? 'inactive_or_invalid' : 'not_found' },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    }
    if (!(await this.passwords.verify(user.passwordHash, dto.password))) {
      await this.audit.log({
        action: AUDIT_ACTIONS.AUTH_LOGIN_FAILURE,
        tenantId: user.tenantId,
        userId: user.id,
        entity: 'User',
        entityId: user.id,
        metadata: { reason: 'invalid_password' },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    }
    await this.prisma.withoutTenantScope(async () =>
      this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    );
    const session = await this.issueSession(user, meta);
    await this.audit.log({
      action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
      tenantId: user.tenantId,
      userId: user.id,
      entity: 'User',
      entityId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return session;
  }

  async refresh(dto: RefreshDto, request: Request, meta: RequestMeta): Promise<AuthTokenResponse> {
    await this.rateLimiter.consume(`refresh:ip:${meta.ipAddress ?? 'unknown'}`);
    const refreshToken = this.readRefreshToken(dto, request);
    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token.');
    }
    const tokenHash = this.tokens.hashRefreshToken(refreshToken);
    const stored = await this.prisma.withoutTenantScope(async () =>
      this.prisma.refreshToken.findUnique({ where: { tokenHash } }),
    );
    if (!stored || stored.revokedAt || stored.expiresAt.getTime() <= Date.now()) {
      if (stored?.revokedAt) {
        await this.revokeFamily(stored.familyId);
      }
      throw new UnauthorizedException('Invalid refresh token.');
    }
    const user = await this.prisma.withoutTenantScope(async () =>
      this.prisma.user.findFirst({
        where: { id: stored.userId, tenantId: stored.tenantId },
        include: userAuthInclude,
      }),
    );
    if (!user || !isUserAllowedToAuthenticate(user as UserWithAuth)) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Invalid refresh token.');
    }
    const replacement = this.tokens.createRefreshTokenValue();
    await this.prisma.withoutTenantScope(async () => {
      const created = await this.prisma.refreshToken.create({
        data: {
          familyId: stored.familyId,
          userId: stored.userId,
          tenantId: stored.tenantId,
          tokenHash: replacement.tokenHash,
          expiresAt: new Date(Date.now() + this.tokens.refreshExpiresInMs()),
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
      });
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date(), replacedById: created.id },
      });
    });
    const access = this.tokens.signAccessToken({
      userId: user.id,
      tenantId: user.tenantId,
      tokenVersion: user.tokenVersion,
    });
    return {
      accessToken: access.token,
      refreshToken: replacement.token,
      tokenType: 'Bearer',
      expiresIn: access.expiresIn,
      user: toAuthUser(user as UserWithAuth),
    };
  }

  async logout(principal: AuthPrincipal, dto: RefreshDto, request: Request, meta: RequestMeta) {
    const refreshToken = this.readRefreshToken(dto, request);
    if (refreshToken) {
      const tokenHash = this.tokens.hashRefreshToken(refreshToken);
      await this.prisma.withoutTenantScope(async () =>
        this.prisma.refreshToken.updateMany({
          where: { tokenHash, userId: principal.userId, tenantId: principal.tenantId, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      );
    }
    await this.tokens.denylistAccessToken(principal.tokenJti, this.tokens.accessExpiresInMs());
    await this.audit.log({
      action: AUDIT_ACTIONS.AUTH_LOGOUT,
      tenantId: principal.tenantId,
      userId: principal.userId,
      entity: 'User',
      entityId: principal.userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return { ok: true as const };
  }

  async listLoginTenants(meta: RequestMeta): Promise<{ items: LoginTenantOption[] }> {
    await this.rateLimiter.consume(`login-tenants:ip:${meta.ipAddress ?? 'unknown'}`);
    const tenants = await this.prisma.withoutTenantScope(async () =>
      this.prisma.tenant.findMany({
        where: { status: 'ACTIVE' },
        select: { name: true, slug: true },
        orderBy: { name: 'asc' },
      }),
    );
    return { items: tenants };
  }

  async meFromDatabase(principal: AuthPrincipal): Promise<AuthMeResponse> {
    const user = await this.prisma.user.findFirst({
      where: { id: principal.userId },
      include: userAuthInclude,
    });
    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }
    const mapped = user as UserWithAuth;
    return {
      user: toAuthUser(mapped),
      tenant: toTenantSummary(mapped.tenant),
      roles: rolesFromUser(mapped),
      permissions: permissionsFromUser(mapped),
    };
  }

  async changePassword(principal: AuthPrincipal, dto: ChangePasswordDto, meta: RequestMeta) {
    await this.rateLimiter.consume(`password:${principal.userId}`);
    const user = await this.prisma.user.findFirst({ where: { id: principal.userId } });
    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }
    if (!(await this.passwords.verify(user.passwordHash, dto.currentPassword))) {
      throw new UnauthorizedException('Current password is incorrect.');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('Choose a different password from your current password.');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await this.passwords.hash(dto.newPassword),
        tokenVersion: { increment: 1 },
        mustChangePassword: false,
      },
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, tenantId: user.tenantId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.tokens.denylistAccessToken(principal.tokenJti, this.tokens.accessExpiresInMs());
    await this.audit.log({
      action: AUDIT_ACTIONS.AUTH_PASSWORD_CHANGE,
      tenantId: principal.tenantId,
      userId: principal.userId,
      entity: 'User',
      entityId: principal.userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return { ok: true as const };
  }

  private async issueSession(user: UserWithAuth, meta: RequestMeta): Promise<AuthTokenResponse> {
    const access = this.tokens.signAccessToken({
      userId: user.id,
      tenantId: user.tenantId,
      tokenVersion: user.tokenVersion,
    });
    const refresh = this.tokens.createRefreshTokenValue();
    await this.prisma.withoutTenantScope(async () =>
      this.prisma.refreshToken.create({
        data: {
          familyId: refresh.familyId,
          userId: user.id,
          tenantId: user.tenantId,
          tokenHash: refresh.tokenHash,
          expiresAt: new Date(Date.now() + this.tokens.refreshExpiresInMs()),
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
      }),
    );
    return {
      accessToken: access.token,
      refreshToken: refresh.token,
      tokenType: 'Bearer',
      expiresIn: access.expiresIn,
      user: toAuthUser(user),
    };
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.withoutTenantScope(async () =>
      this.prisma.refreshToken.updateMany({
        where: { familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    );
  }

  readRefreshToken(dto: RefreshDto | undefined, request: Request): string | undefined {
    const cookieToken = (request.cookies as Record<string, string | undefined> | undefined)?.[REFRESH_COOKIE_NAME];
    return dto?.refreshToken ?? cookieToken;
  }
}

export function requestMeta(request: Request): RequestMeta {
  const userAgentHeader = request.headers['user-agent'];
  return {
    ipAddress: request.ip,
    userAgent: Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader,
  };
}
