import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { assertFound } from '../common/http/assert-found';
import { toPaginationArgs, toPaginationMeta, type PaginationQueryDto } from '../common/dto/pagination-query.dto';

const saleInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  cashier: { select: { id: true, name: true, email: true } },
  items: true,
  payments: true,
} as const;

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query: PaginationQueryDto) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const where = { tenantId };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.sale.findMany({ where, include: saleInclude, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.sale.count({ where }),
    ]);
    return { items, meta: toPaginationMeta(page, pageSize, totalItems) };
  }

  async findById(tenantId: string, id: string) {
    return assertFound(
      await this.prisma.sale.findFirst({ where: { id, tenantId }, include: saleInclude }),
      'Sale not found',
    );
  }
}
