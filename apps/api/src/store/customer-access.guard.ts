import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { TokenService } from '../auth/token.service';
import { PrismaService } from '../prisma/prisma.service';
import type { TenantScopedRequest } from '../common/decorators/tenant-id.decorator';

export type StoreCustomer = {
  customerId: string;
  tenantId: string;
};

@Injectable()
export class CustomerAccessGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantScopedRequest & { storeCustomer?: StoreCustomer }>();
    const header = request.headers.authorization;
    const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) {
      throw new UnauthorizedException('Customer authentication required.');
    }
    try {
      const payload = this.tokens.verifyCustomerAccessToken(token);
      if (!request.tenantId || payload.tenantId !== request.tenantId) {
        throw new UnauthorizedException('Customer authentication required.');
      }
      const customer = await this.prisma.customer.findFirst({
        where: { id: payload.sub, tenantId: payload.tenantId, status: 'ACTIVE' },
        select: { id: true },
      });
      if (!customer) {
        throw new UnauthorizedException('Customer authentication required.');
      }
      request.storeCustomer = { customerId: customer.id, tenantId: payload.tenantId };
      return true;
    } catch {
      throw new UnauthorizedException('Customer authentication required.');
    }
  }
}
