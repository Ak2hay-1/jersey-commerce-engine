import { Injectable } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import type { DashboardPaymentGroup, PaymentReportResult } from '@jersey-commerce/types';
import { DASHBOARD_PAYMENT_GROUPS } from '@jersey-commerce/types';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthPrincipal } from '../common/context/request-context';
import { money, moneyString, roundMoney } from '../pos/pos-money';
import { ReportingScopeService } from './reporting-scope.service';
import { rawMoney } from './reporting-math';
import type { DashboardQueryDto, ReportQueryDto } from './dto/report-query.dto';

@Injectable()
export class PaymentReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ReportingScopeService,
  ) {}

  async report(actor: AuthPrincipal, query: DashboardQueryDto & ReportQueryDto): Promise<PaymentReportResult> {
    const { range, dto } = await this.scope.resolve(actor, query);
    const methodFilter = query.paymentMethod ? Prisma.sql`AND method = ${query.paymentMethod}` : Prisma.sql``;
    const cashierFilter = query.cashierId ? Prisma.sql`AND created_by = ${query.cashierId}` : Prisma.sql``;
    const sessionFilter = query.sessionId ? Prisma.sql`AND pos_session_id = ${query.sessionId}` : Prisma.sql``;
    const collected = await this.prisma.$queryRaw<Array<{ group: string; amount: unknown }>>`
      SELECT
        CASE WHEN method IN ('CASH', 'UPI', 'CARD', 'ONLINE') THEN method::text ELSE 'OTHER' END AS group,
        COALESCE(SUM(amount), 0) AS amount
      FROM payments
      WHERE tenant_id = ${actor.tenantId}
        AND status IN ('COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED')
        AND created_at >= ${range.from}
        AND created_at <= ${range.to}
        ${methodFilter}
        ${cashierFilter}
        ${sessionFilter}
      GROUP BY 1
    `;
    const refunds = await this.prisma.$queryRaw<Array<{ group: string; amount: unknown }>>`
      SELECT
        CASE WHEN method IN ('CASH', 'UPI', 'CARD', 'ONLINE') THEN method::text ELSE 'OTHER' END AS group,
        COALESCE(SUM(amount), 0) AS amount
      FROM refund_payments
      WHERE tenant_id = ${actor.tenantId}
        AND status = 'COMPLETED'
        AND created_at >= ${range.from}
        AND created_at <= ${range.to}
        ${methodFilter}
      GROUP BY 1
    `;
    const collectedMap = new Map(collected.map((row) => [row.group, rawMoney(row.amount)]));
    const refundMap = new Map(refunds.map((row) => [row.group, rawMoney(row.amount)]));
    const methods = DASHBOARD_PAYMENT_GROUPS.map((method) => {
      const payments = collectedMap.get(method) ?? money(0);
      const refunded = refundMap.get(method) ?? money(0);
      return {
        method,
        payments: moneyString(payments),
        refunds: moneyString(refunded),
        net: moneyString(roundMoney(payments.sub(refunded))),
      };
    });
    const totalPayments = methods.reduce((sum, row) => sum.add(money(row.payments)), money(0));
    const totalRefunds = methods.reduce((sum, row) => sum.add(money(row.refunds)), money(0));
    return {
      range: dto,
      totals: {
        totalPayments: moneyString(totalPayments),
        refunds: moneyString(totalRefunds),
        net: moneyString(roundMoney(totalPayments.sub(totalRefunds))),
      },
      methods,
    };
  }

  dashboardBreakdown(result: PaymentReportResult): Array<{ method: DashboardPaymentGroup; amount: string }> {
    return result.methods.map((row) => ({ method: row.method, amount: row.payments }));
  }
}
