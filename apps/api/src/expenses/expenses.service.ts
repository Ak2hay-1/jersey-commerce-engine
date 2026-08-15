import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { assertFound } from '../common/http/assert-found';
import { toPaginationArgs, toPaginationMeta, type PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async findCategories(tenantId: string) {
    return this.prisma.expenseCategory.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async findAll(tenantId: string, query: PaginationQueryDto) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const where = { tenantId };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        include: { category: true },
        orderBy: { expenseDate: 'desc' },
        skip,
        take,
      }),
      this.prisma.expense.count({ where }),
    ]);
    return { items, meta: toPaginationMeta(page, pageSize, totalItems) };
  }

  async findById(tenantId: string, id: string) {
    return assertFound(
      await this.prisma.expense.findFirst({ where: { id, tenantId }, include: { category: true } }),
      'Expense not found',
    );
  }
}
