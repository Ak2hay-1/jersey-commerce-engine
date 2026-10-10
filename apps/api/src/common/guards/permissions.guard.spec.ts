import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { AUDIT_ACTIONS } from '../../audit/audit-actions';
import { ANY_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

function contextFor(permissions: string[]): ExecutionContext {
  const request = {
    method: 'POST',
    route: { path: '/api/v1/pos/sales/:id/cancel' },
    headers: { 'user-agent': 'jest' },
    ip: '10.0.0.5',
    user: { userId: 'user-1', tenantId: 'tenant-1', permissions },
  };
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  const reflectorFor = (all: string[], any: string[] = []) =>
    ({
      getAllAndOverride: (key: string) => (key === ANY_PERMISSIONS_KEY ? any : all),
    }) as unknown as Reflector;
  const reflector = reflectorFor(['sales.cancel']);

  it('allows any-of routes when one permission matches and denies when none do', () => {
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const guard = new PermissionsGuard(reflectorFor([], ['products.create', 'products.update']), audit as never);
    expect(guard.canActivate(contextFor(['products.update']))).toBe(true);
    expect(() => guard.canActivate(contextFor(['products.read']))).toThrow(ForbiddenException);
  });

  it('allows when the user has every required permission', () => {
    const audit = { log: jest.fn() };
    const guard = new PermissionsGuard(reflector, audit as never);
    expect(guard.canActivate(contextFor(['sales.cancel']))).toBe(true);
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('denies and audits when a permission is missing', () => {
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const guard = new PermissionsGuard(reflector, audit as never);
    expect(() => guard.canActivate(contextFor([]))).toThrow(ForbiddenException);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_ACTIONS.AUTH_PERMISSION_DENIED,
        userId: 'user-1',
        tenantId: 'tenant-1',
        entityId: 'POST /api/v1/pos/sales/:id/cancel',
        metadata: { missing: ['sales.cancel'] },
        ipAddress: '10.0.0.5',
      }),
    );
  });
});
