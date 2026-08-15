import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PermissionCode } from '@jersey-commerce/types';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import type { AuthPrincipal } from '../context/request-context';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<{ user?: AuthPrincipal }>();
    const permissions = request.user?.permissions ?? [];
    if (required.some((permission) => !permissions.includes(permission))) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
    return true;
  }
}
