import { Injectable } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import type { CustomOrderReportResult } from '@jersey-commerce/types';
import { CUSTOM_ORDER_STATUSES } from '@jersey-commerce/types';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthPrincipal } from '../common/context/request-context';
import { ReportingScopeService } from './reporting-scope.service';
import { rawCount, rawMoneyString } from './reporting-math';
import type { CustomOrderReportQueryDto } from './dto/report-query.dto';

const QUOTE_STATUSES = ['QUOTATION', 'QUOTE_SENT', 'CUSTOMER_APPROVAL'] as const;
const CONFIRMED_STATUSES = ['DEPOSIT_PENDING', 'CONFIRMED', 'DESIGN_PENDING', 'DESIGN_APPROVAL', 'PRODUCTION', 'READY', 'COMPLETED'] as const;
const PRODUCTION_STATUSES = ['PRODUCTION', 'READY'] as const;

@Injectable()
export class CustomOrderReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ReportingScopeService,
  ) {}

  async report(actor: AuthPrincipal, query: CustomOrderReportQueryDto): Promise<CustomOrderReportResult> {
    const { range, dto } = await this.scope.resolve(actor, query);
    const statusFilter = query.status ? Prisma.sql`AND o.status = ${query.status}` : Prisma.sql``;
    const grouped = await this.prisma.$queryRaw<Array<{ status: string; count: number; total: unknown; balance: unknown }>>`
      SELECT o.status::text AS status, COUNT(*)::int AS count,
             COALESCE(SUM(o.total), 0) AS total,
             COALESCE(SUM(o.balance_due), 0) AS balance
      FROM custom_orders o
      WHERE o.tenant_id = ${actor.tenantId}
        AND o.created_at >= ${range.from}
        AND o.created_at <= ${range.to}
        ${statusFilter}
      GROUP BY o.status
    `;
    const quoted = await this.prisma.$queryRaw<Array<{ total: unknown }>>`
      SELECT COALESCE(SUM(q.total), 0) AS total
      FROM custom_order_quotes q
      INNER JOIN custom_orders o ON o.id = q.custom_order_id
      WHERE q.tenant_id = ${actor.tenantId}
        AND q.is_current = true
        AND o.created_at >= ${range.from}
        AND o.created_at <= ${range.to}
        ${statusFilter}
    `;
    const counts: Record<string, number> = {};
    for (const status of CUSTOM_ORDER_STATUSES) {
      counts[status] = 0;
    }
    let confirmedValue = '0.00';
    let outstanding = '0.00';
    let confirmedOrders = 0;
    let productionOrders = 0;
    for (const row of grouped) {
      counts[row.status] = rawCount(row.count);
      if ((CONFIRMED_STATUSES as readonly string[]).includes(row.status)) {
        confirmedOrders += rawCount(row.count);
      }
      if ((PRODUCTION_STATUSES as readonly string[]).includes(row.status)) {
        productionOrders += rawCount(row.count);
      }
    }
    const confirmedRows = grouped.filter((row) => (CONFIRMED_STATUSES as readonly string[]).includes(row.status));
    confirmedValue = rawMoneyString(
      confirmedRows.reduce((sum, row) => sum + Number(row.total ?? 0), 0).toFixed(2),
    );
    outstanding = rawMoneyString(grouped.reduce((sum, row) => sum + Number(row.balance ?? 0), 0).toFixed(2));
    return {
      range: dto,
      counts,
      totals: {
        enquiries: counts.INQUIRY ?? 0,
        quotes: QUOTE_STATUSES.reduce((sum, status) => sum + (counts[status] ?? 0), 0),
        confirmedOrders,
        productionOrders,
        completedOrders: counts.COMPLETED ?? 0,
        cancelledOrders: counts.CANCELLED ?? 0,
        quotedValue: rawMoneyString(quoted[0]?.total),
        confirmedValue,
        outstandingBalances: outstanding,
      },
    };
  }
}
