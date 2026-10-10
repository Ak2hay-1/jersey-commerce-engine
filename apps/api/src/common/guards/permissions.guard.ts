import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { PermissionCode } from '@jersey-commerce/types';
import { ANY_PERMISSIONS_KEY, PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import type { AuthPrincipal } from '../context/request-context';
import { AuditService } from '../../audit/audit.service';
import { AUDIT_ACTIONS } from '../../audit/audit-actions';
import { resolveClientIp } from '../http/client-ip';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional() private readonly audit?: AuditService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(PERMISSIONS_KEY, targets) ?? [];
    const anyOf = this.reflector.getAllAndOverride<PermissionCode[]>(ANY_PERMISSIONS_KEY, targets) ?? [];
    if (required.length === 0 && anyOf.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request & { user?: AuthPrincipal }>();
    const permissions = request.user?.permissions ?? [];
    const missing = required.filter((permission) => !permissions.includes(permission));
    if (anyOf.length > 0 && !anyOf.some((permission) => permissions.includes(permission))) {
      missing.push(...anyOf);
    }
    if (missing.length > 0) {
      this.recordDenial(request, missing);
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
    return true;
  }

  private recordDenial(request: Request & { user?: AuthPrincipal }, missing: PermissionCode[]): void {
    if (!this.audit) {
      return;
    }
    const userAgent = request.headers?.['user-agent'];
    void this.audit
      .log({
        action: AUDIT_ACTIONS.AUTH_PERMISSION_DENIED,
        tenantId: request.user?.tenantId,
        userId: request.user?.userId,
        entity: 'Route',
        entityId: `${request.method} ${request.route?.path ?? request.path ?? request.url}`,
        metadata: { missing },
        ipAddress: request.headers ? resolveClientIp(request) : undefined,
        userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
      })
      .catch(() => undefined);
  }
}
