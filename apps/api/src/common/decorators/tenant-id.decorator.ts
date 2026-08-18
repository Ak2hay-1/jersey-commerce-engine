import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthPrincipal } from '../context/request-context';

export const TENANT_ID_HEADER = 'x-tenant-id';

export type TenantScopedRequest = Request & {
  tenantId?: string;
  user?: AuthPrincipal;
};

export const TenantId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<TenantScopedRequest>();
  const tenantId = request.user?.tenantId ?? request.tenantId;
  if (!tenantId) {
    throw new UnauthorizedException('Authentication required.');
  }
  return tenantId;
});
