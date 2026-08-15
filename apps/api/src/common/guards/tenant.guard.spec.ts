import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { TenantGuard } from './tenant.guard';

function contextWithUser(user?: { tenantId: string }): ExecutionContext {
  const request: { headers: Record<string, string | undefined>; tenantId?: string; user?: { tenantId: string } } = {
    headers: { 'x-tenant-id': 'ignored-client-value' },
    user,
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('TenantGuard', () => {
  const guard = new TenantGuard();

  it('attaches tenantId from the authenticated identity and ignores client headers', () => {
    const ctx = contextWithUser({ tenantId: 'tenant_123' });
    expect(guard.canActivate(ctx)).toBe(true);
    expect(ctx.switchToHttp().getRequest<{ tenantId?: string }>().tenantId).toBe('tenant_123');
  });

  it('rejects missing authenticated tenant context', () => {
    expect(() => guard.canActivate(contextWithUser(undefined))).toThrow(UnauthorizedException);
  });
});
