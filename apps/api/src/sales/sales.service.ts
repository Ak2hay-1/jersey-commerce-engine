import { Injectable } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertFound } from '../common/http/assert-found';
import { toPaginationArgs, toPaginationMeta } from '../common/dto/pagination-query.dto';
import type { SaleQueryDto } from './dto/sale-query.dto';

const saleInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  cashier: { select: { id: true, name: true, email: true } },
  items: true,
  payments: true,
  ecommerceOrder: { select: { id: true, source: true, orderNumber: true } },
} as const;

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query: SaleQueryDto) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const where: Prisma.SaleWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.cashierId ? { cashierId: query.cashierId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
              { customer: { is: { name: { contains: query.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };
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
