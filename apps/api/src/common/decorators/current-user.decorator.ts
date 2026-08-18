import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { AuthPrincipal } from '../context/request-context';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthPrincipal => {
    const request = context.switchToHttp().getRequest<{ user?: AuthPrincipal }>();
    if (!request.user) {
      throw new UnauthorizedException('Authentication required.');
    }
    return request.user;
  },
);
