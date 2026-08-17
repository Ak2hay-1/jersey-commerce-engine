import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TokenService } from '../auth/token.service';
import { PrismaService } from '../prisma/prisma.service';
import type { TenantScopedRequest } from '../common/decorators/tenant-id.decorator';
import type { StoreCustomer } from './customer-access.guard';

@Injectable()
export class OptionalCustomerGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantScopedRequest & { storeCustomer?: StoreCustomer }>();
    const header = request.headers.authorization;
    const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token || !request.tenantId) {
      return true;
    }
    try {
      const payload = this.tokens.verifyCustomerAccessToken(token);
      if (payload.tenantId !== request.tenantId) {
        return true;
      }
      const customer = await this.prisma.customer.findFirst({
        where: { id: payload.sub, tenantId: payload.tenantId, status: 'ACTIVE' },
        select: { id: true },
      });
      if (customer) {
        request.storeCustomer = { customerId: customer.id, tenantId: payload.tenantId };
      }
    } catch {
      return true;
    }
    return true;
  }
}
