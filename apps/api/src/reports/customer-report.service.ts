import { Injectable } from '@nestjs/common';
import type { CustomerReportResult } from '@jersey-commerce/types';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthPrincipal } from '../common/context/request-context';
import { CustomerInsightsService } from '../customers/customer-insights.service';
import { toPaginationArgs, toPaginationMeta } from '../common/dto/pagination-query.dto';
import { money, moneyString, roundMoney } from '../pos/pos-money';
import { ReportingScopeService } from './reporting-scope.service';
import { rawCount, rawMoney, rawMoneyString } from './reporting-math';
import type { CustomerAnalyticsQueryDto } from './dto/report-query.dto';

@Injectable()
export class CustomerReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ReportingScopeService,
    private readonly insights: CustomerInsightsService,
  ) {}

  async report(actor: AuthPrincipal, query: CustomerAnalyticsQueryDto): Promise<CustomerReportResult> {
    const { range, dto } = await this.scope.resolve(actor, query);
    const summary = await this.insights.dashboard(actor.tenantId, {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    });
    const { page, pageSize } = toPaginationArgs(query);
    const segment = query.segment ?? 'top';
    const listQuery = { from: dto.from, to: dto.to, page, pageSize };
    const { items, meta } = await this.segmentRows(actor.tenantId, segment, listQuery, range);
    const spend = await this.prisma.$queryRaw<Array<{ total: unknown; orders: unknown }>>`
      SELECT COALESCE(SUM(total), 0) AS total, COUNT(*)::int AS orders FROM (
        SELECT s.total FROM sales s
        WHERE s.tenant_id = ${actor.tenantId}
          AND s.status NOT IN ('VOIDED', 'CANCELLED')
          AND s.created_at >= ${range.from} AND s.created_at <= ${range.to}
        UNION ALL
        SELECT o.total FROM orders o
        WHERE o.tenant_id = ${actor.tenantId}
          AND o.status = 'COMPLETED' AND o.sale_id IS NULL
          AND COALESCE(o.completed_at, o.created_at) >= ${range.from}
          AND COALESCE(o.completed_at, o.created_at) <= ${range.to}
      ) docs
    `;
    const totalSpending = rawMoney(spend[0]?.total);
    const orderCount = rawCount(spend[0]?.orders);
    const aov = orderCount === 0 ? '0.00' : moneyString(roundMoney(totalSpending.div(orderCount)));
    const newCustomers = await this.prisma.customer.count({
      where: { tenantId: actor.tenantId, createdAt: { gte: range.from, lte: range.to } },
    });
    return {
      range: dto,
      totals: {
        newCustomers,
        repeatCustomers: summary.repeatCustomers,
        highValueCustomers: summary.highValueCustomers,
        inactiveCustomers: summary.inactiveCustomers,
        totalSpending: rawMoneyString(spend[0]?.total),
        averageOrderValue: aov,
      },
      items,
      meta,
    };
  }

  async periodSnapshot(actor: AuthPrincipal, query: CustomerAnalyticsQueryDto) {
    const { range } = await this.scope.resolve(actor, query);
    const summary = await this.insights.dashboard(actor.tenantId, {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    });
    const newCustomers = await this.prisma.customer.count({
      where: { tenantId: actor.tenantId, createdAt: { gte: range.from, lte: range.to } },
    });
    return {
      newCustomers,
      repeatCustomers: summary.repeatCustomers,
      highValueCustomers: summary.highValueCustomers,
      inactiveCustomers: summary.inactiveCustomers,
    };
  }

  private async segmentRows(
    tenantId: string,
    segment: 'new' | 'repeat' | 'high_value' | 'inactive' | 'top',
    listQuery: { from: string; to: string; page: number; pageSize: number },
    range: { from: Date; to: Date },
  ) {
    if (segment === 'new') {
      const { page, pageSize, skip, take } = toPaginationArgs(listQuery);
      const where = { tenantId, createdAt: { gte: range.from, lte: range.to } };
      const [rows, totalItems] = await this.prisma.$transaction([
        this.prisma.customer.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
        this.prisma.customer.count({ where }),
      ]);
      return {
        items: rows.map((row) => ({
          id: row.id,
          name: row.name,
          phone: row.phone,
          email: row.email,
          createdAt: row.createdAt.toISOString(),
          orderCount: 0,
          totalSpent: '0.00',
          averageOrderValue: '0.00',
          lastPurchaseAt: null as string | null,
          segment,
        })),
        meta: toPaginationMeta(page, pageSize, totalItems),
      };
    }
    if (segment === 'inactive') {
      const result = await this.insights.inactive(tenantId, { page: listQuery.page, pageSize: listQuery.pageSize });
      return {
        items: result.items.map((row) => ({
          id: row.customer.id,
          name: row.customer.name,
          phone: row.customer.phone,
          email: row.customer.email,
          createdAt: row.customer.createdAt,
          orderCount: 0,
          totalSpent: row.totalSpent,
          averageOrderValue: row.totalSpent,
          lastPurchaseAt: row.lastPurchaseAt,
          segment,
        })),
        meta: result.meta,
      };
    }
    const result =
      segment === 'repeat' ? await this.insights.repeat(tenantId, listQuery) : await this.insights.top(tenantId, listQuery);
    const mapped = result.items.map((row) => ({
      id: row.customer.id,
      name: row.customer.name,
      phone: row.customer.phone,
      email: row.customer.email,
      createdAt: row.customer.createdAt,
      orderCount: row.purchaseCount,
      totalSpent: row.totalSpent,
      averageOrderValue: this.average(row.totalSpent, row.purchaseCount),
      lastPurchaseAt: row.lastPurchaseAt,
      segment: segment === 'high_value' ? 'high_value' : segment,
    }));
    const items =
      segment === 'high_value' ? mapped.filter((row) => Number(row.totalSpent) >= 10000) : mapped;
    return { items, meta: result.meta };
  }

  private average(total: string, count: number): string {
    if (!count) {
      return '0.00';
    }
    return moneyString(roundMoney(money(total).div(count)));
  }
}
