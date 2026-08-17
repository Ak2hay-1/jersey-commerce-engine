import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ServerEnv } from '@jersey-commerce/config';
import type { Request } from 'express';

@Injectable()
export class BootstrapGuard implements CanActivate {
  constructor(private readonly config: ConfigService<ServerEnv, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get('BOOTSTRAP_SECRET', { infer: true });
    if (!secret) {
      throw new NotFoundException();
    }
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers['x-bootstrap-secret'];
    const header = Array.isArray(provided) ? provided[0] : provided;
    if (!header || header !== secret) {
      throw new UnauthorizedException('Invalid bootstrap secret.');
    }
    return true;
  }
}
