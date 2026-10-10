import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthSessionService } from './auth-session.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';

function setup(options: { revokedAt?: Date | null; claimCount?: number }) {
  const stored = {
    id: 'rt-1',
    familyId: 'fam-1',
    userId: 'user-1',
    tenantId: 'tenant-1',
    revokedAt: options.revokedAt ?? null,
    expiresAt: new Date(Date.now() + 60_000),
  };
  const tx = {
    refreshToken: {
      updateMany: jest.fn().mockResolvedValue({ count: options.claimCount ?? 1 }),
      create: jest.fn().mockResolvedValue({ id: 'rt-2' }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const prisma = {
    withoutTenantScope: <T>(fn: () => Promise<T>) => fn(),
    $transaction: <T>(fn: (client: typeof tx) => Promise<T>) => fn(tx),
    refreshToken: {
      findUnique: jest.fn().mockResolvedValue(stored),
      updateMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'user-1',
        tenantId: 'tenant-1',
        email: 'staff@example.com',
        name: 'Staff',
        phone: null,
        tokenVersion: 0,
        status: 'ACTIVE',
        mustChangePassword: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        userRoles: [],
        tenant: { id: 'tenant-1', slug: 'demo', name: 'Demo', status: 'ACTIVE' },
      }),
    },
  };
  const tokens = {
    hashRefreshToken: jest.fn().mockReturnValue('hash'),
    createRefreshTokenValue: jest.fn().mockReturnValue({ token: 'new-token', tokenHash: 'new-hash' }),
    refreshExpiresInMs: jest.fn().mockReturnValue(60_000),
    signAccessToken: jest.fn().mockReturnValue({ token: 'access', expiresIn: 900 }),
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const rateLimiter = { consume: jest.fn().mockResolvedValue(undefined) };
  const service = new AuthSessionService(
    prisma as never,
    {} as never,
    tokens as never,
    audit as never,
    rateLimiter as never,
  );
  const request = { cookies: {} } as unknown as Request;
  return { service, prisma, tx, audit, request };
}

describe('AuthSessionService.refresh', () => {
  it('rotates an active refresh token', async () => {
    const { service, tx, request } = setup({});
    const result = await service.refresh({ refreshToken: 'old' }, request, { ipAddress: '1.1.1.1' });
    expect(result.refreshToken).toBe('new-token');
    expect(tx.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { id: 'rt-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(tx.refreshToken.create).toHaveBeenCalled();
  });

  it('treats a lost race as reuse: revokes the family and audits', async () => {
    const { service, prisma, tx, audit, request } = setup({ claimCount: 0 });
    await expect(service.refresh({ refreshToken: 'old' }, request, {})).rejects.toBeInstanceOf(UnauthorizedException);
    expect(tx.refreshToken.create).not.toHaveBeenCalled();
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { familyId: 'fam-1', revokedAt: null } }),
    );
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: AUDIT_ACTIONS.AUTH_REFRESH_REUSE }));
  });

  it('treats a previously revoked token as reuse', async () => {
    const { service, prisma, audit, request } = setup({ revokedAt: new Date() });
    await expect(service.refresh({ refreshToken: 'old' }, request, {})).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: AUDIT_ACTIONS.AUTH_REFRESH_REUSE }));
  });
});
