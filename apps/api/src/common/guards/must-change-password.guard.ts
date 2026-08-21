import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthPrincipal } from '../context/request-context';

@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest<{
      user?: AuthPrincipal;
      method?: string;
      originalUrl?: string;
      url?: string;
    }>();
    if (!request.user?.mustChangePassword) {
      return true;
    }
    const method = (request.method ?? 'GET').toUpperCase();
    const path = (request.originalUrl ?? request.url ?? '').split('?')[0] ?? '';
    const allowed =
      (method === 'GET' && path.endsWith('/auth/me')) ||
      (method === 'POST' && path.endsWith('/auth/change-password')) ||
      (method === 'POST' && path.endsWith('/auth/logout'));
    if (!allowed) {
      throw new ForbiddenException('You must change your password before continuing.');
    }
    return true;
  }
}
