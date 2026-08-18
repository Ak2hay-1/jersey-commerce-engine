import { Injectable } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import type { ExpenseReportResult } from '@jersey-commerce/types';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthPrincipal } from '../common/context/request-context';
import { toPaginationArgs, toPaginationMeta } from '../common/dto/pagination-query.dto';
import { ReportingScopeService } from './reporting-scope.service';
import { rawMoneyString } from './reporting-math';
import type { ExpenseReportQueryDto } from './dto/report-query.dto';
import { ymdInTimeZone } from './date-range';

@Injectable()
export class ExpenseReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ReportingScopeService,
  ) {}

  async report(actor: AuthPrincipal, query: ExpenseReportQueryDto): Promise<ExpenseReportResult> {
    const { range, dto } = await this.scope.resolve(actor, query);
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const categoryFilter = query.categoryId ? Prisma.sql`AND e.category_id = ${query.categoryId}` : Prisma.sql``;
    const [totals] = await this.prisma.$queryRaw<Array<{ total: unknown }>>`
      SELECT COALESCE(SUM(e.amount), 0) AS total
      FROM expenses e
      WHERE e.tenant_id = ${actor.tenantId}
        AND e.status = 'ACTIVE'
        AND e.expense_date >= ${range.from}
        AND e.expense_date <= ${range.to}
        ${categoryFilter}
    `;
    const byCategory = await this.prisma.$queryRaw<Array<{ category: string; amount: unknown }>>`
      SELECT c.name AS category, COALESCE(SUM(e.amount), 0) AS amount
      FROM expenses e
      INNER JOIN expense_categories c ON c.id = e.category_id
      WHERE e.tenant_id = ${actor.tenantId}
        AND e.status = 'ACTIVE'
        AND e.expense_date >= ${range.from}
        AND e.expense_date <= ${range.to}
        ${categoryFilter}
      GROUP BY c.name
      ORDER BY amount DESC
    `;
    const trend = await this.prisma.$queryRaw<Array<{ bucket: Date; amount: unknown }>>`
      SELECT DATE_TRUNC('day', e.expense_date) AS bucket, COALESCE(SUM(e.amount), 0) AS amount
      FROM expenses e
      WHERE e.tenant_id = ${actor.tenantId}
        AND e.status = 'ACTIVE'
        AND e.expense_date >= ${range.from}
        AND e.expense_date <= ${range.to}
        ${categoryFilter}
      GROUP BY 1
      ORDER BY 1
    `;
    const items = await this.prisma.expense.findMany({
      where: {
        tenantId: actor.tenantId,
        status: 'ACTIVE',
        expenseDate: { gte: range.from, lte: range.to },
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      },
      include: { category: true },
      orderBy: { expenseDate: 'desc' },
      skip,
      take,
    });
    const totalItems = await this.prisma.expense.count({
      where: {
        tenantId: actor.tenantId,
        status: 'ACTIVE',
        expenseDate: { gte: range.from, lte: range.to },
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      },
    });
    return {
      range: dto,
      totals: { totalExpenses: rawMoneyString(totals?.total) },
      byCategory: byCategory.map((row) => ({ category: row.category, amount: rawMoneyString(row.amount) })),
      trend: trend.map((row) => {
        const bucket = new Date(row.bucket);
        const ymd = ymdInTimeZone(bucket, range.timeZone);
        return {
          bucket: bucket.toISOString(),
          label: `${ymd.day}/${ymd.month}`,
          amount: rawMoneyString(row.amount),
        };
      }),
      items: items.map((item) => ({
        id: item.id,
        category: item.category.name,
        amount: item.amount.toFixed(2),
        expenseDate: item.expenseDate.toISOString().slice(0, 10),
        paymentMethod: item.paymentMethod,
        status: item.status,
        description: item.description,
      })),
      meta: toPaginationMeta(page, pageSize, totalItems),
    };
  }

  async periodTotal(actor: AuthPrincipal, query: ExpenseReportQueryDto) {
    const { range } = await this.scope.resolve(actor, query);
    const [row] = await this.prisma.$queryRaw<Array<{ total: unknown }>>`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM expenses
      WHERE tenant_id = ${actor.tenantId}
        AND status = 'ACTIVE'
        AND expense_date >= ${range.from}
        AND expense_date <= ${range.to}
    `;
    return rawMoneyString(row?.total);
  }
}
