import { Injectable } from '@nestjs/common';
import type { PaginatedData, TenantSummary } from '@jersey-commerce/types';
import { PrismaService } from '../prisma/prisma.service';
import { assertFound } from '../common/http/assert-found';
import { toPaginationArgs, toPaginationMeta } from '../common/dto/pagination-query.dto';
import type { TenantQueryDto } from './tenants.dto';

const tenantSelect = {
  id: true,
  slug: true,
  name: true,
  legalName: true,
  logo: true,
  primaryColor: true,
  secondaryColor: true,
  timezone: true,
  currency: true,
  status: true,
} as const;

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: TenantQueryDto): Promise<PaginatedData<TenantSummary>> {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const where = query.slug ? { slug: query.slug } : {};
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        where,
        select: tenantSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.tenant.count({ where }),
    ]);
    return { items, meta: toPaginationMeta(page, pageSize, totalItems) };
  }

  async findById(id: string): Promise<TenantSummary> {
    return assertFound(
      await this.prisma.tenant.findUnique({ where: { id }, select: tenantSelect }),
      'Tenant not found',
    );
  }
}
