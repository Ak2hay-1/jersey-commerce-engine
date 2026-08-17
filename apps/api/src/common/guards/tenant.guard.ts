import {
  applyDecorators,
  CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { AuthPrincipal } from '../context/request-context';
import { TENANT_ID_HEADER, type TenantScopedRequest } from '../decorators/tenant-id.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TenantScopedRequest & { user?: AuthPrincipal }>();
    const tenantId = request.user?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Authentication required.');
    }
    request.tenantId = tenantId;
    return true;
  }
}

export function TenantScoped() {
  return applyDecorators(
    UseGuards(TenantGuard),
    ApiBearerAuth('access-token'),
  );
}

export { TENANT_ID_HEADER };
