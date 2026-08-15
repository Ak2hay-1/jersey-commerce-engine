import { Injectable } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import type { PurchaseReportResult } from '@jersey-commerce/types';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthPrincipal } from '../common/context/request-context';
import { toPaginationArgs, toPaginationMeta } from '../common/dto/pagination-query.dto';
import { ReportingScopeService } from './reporting-scope.service';
import { rawCount, rawMoney, rawMoneyString } from './reporting-math';
import { moneyString, roundMoney } from '../pos/pos-money';
import type { PurchaseReportQueryDto } from './dto/report-query.dto';

@Injectable()
export class PurchaseReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ReportingScopeService,
  ) {}

  async report(actor: AuthPrincipal, query: PurchaseReportQueryDto): Promise<PurchaseReportResult> {
    const { range, dto } = await this.scope.resolve(actor, query);
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const supplierFilter = query.supplierId ? Prisma.sql`AND p.supplier_id = ${query.supplierId}` : Prisma.sql``;
    const [totals] = await this.prisma.$queryRaw<
      Array<{
        purchase_count: number;
        quantity_ordered: unknown;
        quantity_received: unknown;
        total: unknown;
        outstanding: unknown;
      }>
    >`
      SELECT
        COUNT(*)::int AS purchase_count,
        COALESCE((
          SELECT SUM(pi.ordered_quantity) FROM purchase_items pi
          INNER JOIN purchases p2 ON p2.id = pi.purchase_id
          WHERE p2.tenant_id = ${actor.tenantId}
            AND p2.status IN ('ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED')
            AND p2.created_at >= ${range.from} AND p2.created_at <= ${range.to}
            ${query.supplierId ? Prisma.sql`AND p2.supplier_id = ${query.supplierId}` : Prisma.sql``}
        ), 0)::int AS quantity_ordered,
        COALESCE((
          SELECT SUM(pi.received_quantity) FROM purchase_items pi
          INNER JOIN purchases p2 ON p2.id = pi.purchase_id
          WHERE p2.tenant_id = ${actor.tenantId}
            AND p2.status IN ('ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED')
            AND p2.created_at >= ${range.from} AND p2.created_at <= ${range.to}
            ${query.supplierId ? Prisma.sql`AND p2.supplier_id = ${query.supplierId}` : Prisma.sql``}
        ), 0)::int AS quantity_received,
        COALESCE(SUM(p.total), 0) AS total,
        COALESCE(SUM(p.total), 0) - COALESCE((
          SELECT SUM(sp.amount) FROM supplier_payments sp
          WHERE sp.tenant_id = ${actor.tenantId}
            AND sp.status = 'COMPLETED'
            AND sp.created_at >= ${range.from} AND sp.created_at <= ${range.to}
            ${query.supplierId ? Prisma.sql`AND sp.supplier_id = ${query.supplierId}` : Prisma.sql``}
        ), 0) AS outstanding
      FROM purchases p
      WHERE p.tenant_id = ${actor.tenantId}
        AND p.status IN ('ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED')
        AND p.created_at >= ${range.from}
        AND p.created_at <= ${range.to}
        ${supplierFilter}
    `;
    const items = await this.prisma.$queryRaw<
      Array<{
        id: string;
        purchase_number: string;
        supplier_id: string;
        supplier_name: string;
        status: string;
        created_at: Date;
        quantity_ordered: number;
        quantity_received: number;
        total: unknown;
        paid: unknown;
      }>
    >`
      SELECT p.id, p.purchase_number, p.supplier_id, s.name AS supplier_name, p.status::text AS status, p.created_at,
             COALESCE((SELECT SUM(pi.ordered_quantity) FROM purchase_items pi WHERE pi.purchase_id = p.id), 0)::int AS quantity_ordered,
             COALESCE((SELECT SUM(pi.received_quantity) FROM purchase_items pi WHERE pi.purchase_id = p.id), 0)::int AS quantity_received,
             p.total,
             COALESCE((
               SELECT SUM(sp.amount) FROM supplier_payments sp
               WHERE sp.purchase_id = p.id AND sp.status = 'COMPLETED'
             ), 0) AS paid
      FROM purchases p
      INNER JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.tenant_id = ${actor.tenantId}
        AND p.status IN ('ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED')
        AND p.created_at >= ${range.from}
        AND p.created_at <= ${range.to}
        ${supplierFilter}
      ORDER BY p.created_at DESC
      OFFSET ${skip} LIMIT ${take}
    `;
    const countRows = await this.prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM purchases p
      WHERE p.tenant_id = ${actor.tenantId}
        AND p.status IN ('ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED')
        AND p.created_at >= ${range.from}
        AND p.created_at <= ${range.to}
        ${supplierFilter}
    `;
    return {
      range: dto,
      totals: {
        purchaseCount: rawCount(totals?.purchase_count),
        quantityOrdered: rawCount(totals?.quantity_ordered),
        quantityReceived: rawCount(totals?.quantity_received),
        total: rawMoneyString(totals?.total),
        outstanding: rawMoneyString(totals?.outstanding),
      },
      items: items.map((row) => {
        const total = rawMoney(row.total);
        const paid = rawMoney(row.paid);
        return {
          id: row.id,
          purchaseNumber: row.purchase_number,
          supplierId: row.supplier_id,
          supplierName: row.supplier_name,
          status: row.status,
          createdAt: new Date(row.created_at).toISOString(),
          quantityOrdered: row.quantity_ordered,
          quantityReceived: row.quantity_received,
          total: rawMoneyString(row.total),
          paid: rawMoneyString(row.paid),
          outstanding: moneyString(roundMoney(total.sub(paid))),
        };
      }),
      meta: toPaginationMeta(page, pageSize, rawCount(countRows[0]?.count)),
    };
  }

  async outstandingBalance(actor: AuthPrincipal) {
    const [row] = await this.prisma.$queryRaw<Array<{ outstanding: unknown }>>`
      SELECT COALESCE((
        SELECT SUM(p.total) FROM purchases p
        WHERE p.tenant_id = ${actor.tenantId}
          AND p.status IN ('ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED')
      ), 0) - COALESCE((
        SELECT SUM(sp.amount) FROM supplier_payments sp
        WHERE sp.tenant_id = ${actor.tenantId} AND sp.status = 'COMPLETED'
      ), 0) AS outstanding
    `;
    return rawMoneyString(row?.outstanding);
  }

  async topSuppliers(actor: AuthPrincipal, query: PurchaseReportQueryDto, take = 5) {
    const { range } = await this.scope.resolve(actor, query);
    const rows = await this.prisma.$queryRaw<
      Array<{ supplier_id: string; name: string; total: unknown; count: number }>
    >`
      SELECT p.supplier_id, s.name, COALESCE(SUM(p.total), 0) AS total, COUNT(*)::int AS count
      FROM purchases p
      INNER JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.tenant_id = ${actor.tenantId}
        AND p.status IN ('ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED')
        AND p.created_at >= ${range.from}
        AND p.created_at <= ${range.to}
      GROUP BY p.supplier_id, s.name
      ORDER BY total DESC
      LIMIT ${take}
    `;
    return rows.map((row) => ({
      supplierId: row.supplier_id,
      name: row.name,
      purchaseCount: row.count,
      totalPurchases: rawMoneyString(row.total),
    }));
  }
}
