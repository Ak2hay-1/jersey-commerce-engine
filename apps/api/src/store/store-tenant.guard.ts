import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { TenantScopedRequest } from '../common/decorators/tenant-id.decorator';
import { StoreBootstrapService } from './store-bootstrap.service';

export const TENANT_SLUG_HEADER = 'x-tenant-slug';

@Injectable()
export class StoreTenantGuard implements CanActivate {
  constructor(private readonly bootstrap: StoreBootstrapService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantScopedRequest>();
    const raw = request.headers[TENANT_SLUG_HEADER];
    const slug = (Array.isArray(raw) ? raw[0] : raw)?.trim().toLowerCase();
    const host = request.headers.host;
    const tenant = await this.bootstrap.findTenant({ slug, host: typeof host === 'string' ? host : undefined });
    if (!slug && !tenant) {
      throw new BadRequestException('X-Tenant-Slug is required.');
    }
    if (!tenant || tenant.status === 'SUSPENDED' || tenant.status === 'CANCELLED') {
      throw new UnauthorizedException('Store is not available.');
    }
    request.tenantId = tenant.id;
    return true;
  }
}

export function cartTokenFromRequest(request: Request): string | undefined {
  const header = request.headers['x-cart-token'];
  const fromHeader = (Array.isArray(header) ? header[0] : header)?.trim();
  if (fromHeader) {
    return fromHeader;
  }
  const cookie = request.cookies?.jce_cart_token;
  return typeof cookie === 'string' && cookie.trim() ? cookie.trim() : undefined;
}

export function idempotencyKeyFromRequest(request: Request): string | undefined {
  const header = request.headers['idempotency-key'];
  const value = (Array.isArray(header) ? header[0] : header)?.trim();
  return value || undefined;
}
