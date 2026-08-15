import { Injectable } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import type {
  ProfitabilityTotals,
  RevenueGranularity,
  RevenueSeries,
  SalesReportResult,
  TopProductRow,
  TopProductSort,
} from '@jersey-commerce/types';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthPrincipal } from '../common/context/request-context';
import { toPaginationArgs, toPaginationMeta } from '../common/dto/pagination-query.dto';
import { profitability, rawCount, rawMoney, rawMoneyString } from './reporting-math';
import { ReportingScopeService } from './reporting-scope.service';
import type { SalesReportQueryDto } from './dto/report-query.dto';
import { ymdInTimeZone } from './date-range';

type TotalsRow = {
  revenue: unknown;
  cogs: unknown;
  discount: unknown;
  tax: unknown;
  quantity: unknown;
  order_count: unknown;
};

type SaleRow = {
  id: string;
  reference: string;
  created_at: Date;
  source: string;
  cashier_id: string | null;
  cashier_name: string | null;
  customer_id: string | null;
  customer_name: string | null;
  payment_method: string | null;
  status: string;
  quantity: unknown;
  revenue: unknown;
  discount: unknown;
  tax: unknown;
  cogs: unknown;
};

type DocumentFilters = {
  tenantId: string;
  from: Date;
  to: Date;
  source?: string;
  cashierId?: string;
  customerId?: string;
  paymentMethod?: string;
  productId?: string;
  categoryId?: string;
  status?: string;
};

@Injectable()
export class SalesReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ReportingScopeService,
  ) {}

  async profitabilityTotals(actor: AuthPrincipal, query: SalesReportQueryDto): Promise<ProfitabilityTotals> {
    const { range } = await this.scope.resolve(actor, query);
    const filters = this.lineFilters(actor.tenantId, range.from, range.to, query);
    const rows = await this.prisma.$queryRaw<TotalsRow[]>`
      SELECT
        COALESCE(SUM(revenue), 0) AS revenue,
        COALESCE(SUM(cogs), 0) AS cogs,
        COALESCE(SUM(discount), 0) AS discount,
        COALESCE(SUM(tax), 0) AS tax,
        COALESCE(SUM(quantity), 0)::int AS quantity,
        COUNT(*)::int AS order_count
      FROM (${this.recognizedDocuments(filters)}) AS docs
    `;
    const row = rows[0];
    return {
      ...profitability(rawMoney(row?.revenue), rawMoney(row?.cogs)),
      quantity: rawCount(row?.quantity),
      orderCount: rawCount(row?.order_count),
      discount: rawMoneyString(row?.discount),
      tax: rawMoneyString(row?.tax),
    };
  }

  async salesReport(actor: AuthPrincipal, query: SalesReportQueryDto): Promise<SalesReportResult> {
    const { range, dto } = await this.scope.resolve(actor, query);
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const filters = this.lineFilters(actor.tenantId, range.from, range.to, query);
    const docs = this.recognizedDocuments(filters);
    const [totals, countRows, items] = await Promise.all([
      this.profitabilityTotals(actor, query),
      this.prisma.$queryRaw<Array<{ count: number }>>`SELECT COUNT(*)::int AS count FROM (${docs}) AS docs`,
      this.prisma.$queryRaw<SaleRow[]>`
        SELECT * FROM (${docs}) AS docs
        ORDER BY created_at DESC
        OFFSET ${skip} LIMIT ${take}
      `,
    ]);
    return {
      range: dto,
      totals,
      items: items.map((row) => {
        const profit = profitability(rawMoney(row.revenue), rawMoney(row.cogs));
        return {
          id: row.id,
          invoiceNumber: row.reference,
          createdAt: new Date(row.created_at).toISOString(),
          source: row.source as SalesReportResult['items'][number]['source'],
          cashierId: row.cashier_id,
          cashierName: row.cashier_name,
          customerId: row.customer_id,
          customerName: row.customer_name,
          paymentMethod: (row.payment_method as SalesReportResult['items'][number]['paymentMethod']) ?? null,
          status: row.status as SalesReportResult['items'][number]['status'],
          quantity: rawCount(row.quantity),
          revenue: profit.revenue,
          discount: rawMoneyString(row.discount),
          tax: rawMoneyString(row.tax),
          cogs: profit.cogs,
          grossProfit: profit.grossProfit,
          marginPercent: profit.marginPercent,
        };
      }),
      meta: toPaginationMeta(page, pageSize, rawCount(countRows[0]?.count)),
    };
  }

  async revenueSeries(
    actor: AuthPrincipal,
    query: SalesReportQueryDto & { granularity?: RevenueGranularity },
  ): Promise<RevenueSeries> {
    const { range, dto } = await this.scope.resolve(actor, query);
    const granularity = query.granularity ?? this.defaultGranularity(range.from, range.to);
    const trunc =
      granularity === 'weekly' ? Prisma.raw(`'week'`) : granularity === 'monthly' ? Prisma.raw(`'month'`) : Prisma.raw(`'day'`);
    const filters = this.lineFilters(actor.tenantId, range.from, range.to, query);
    const rows = await this.prisma.$queryRaw<Array<{ bucket: Date; revenue: unknown }>>`
      SELECT DATE_TRUNC(${trunc}, created_at AT TIME ZONE ${range.timeZone}) AS bucket,
             COALESCE(SUM(revenue), 0) AS revenue
      FROM (${this.recognizedDocuments(filters)}) AS docs
      GROUP BY 1
      ORDER BY 1
    `;
    return {
      range: dto,
      granularity,
      points: rows.map((row) => {
        const bucket = new Date(row.bucket);
        return {
          bucket: bucket.toISOString(),
          label: this.bucketLabel(bucket, granularity, range.timeZone),
          revenue: rawMoneyString(row.revenue),
        };
      }),
    };
  }

  async salesByChannel(actor: AuthPrincipal, query: SalesReportQueryDto) {
    const { range } = await this.scope.resolve(actor, query);
    const filters = this.lineFilters(actor.tenantId, range.from, range.to, query);
    const rows = await this.prisma.$queryRaw<Array<{ source: string; revenue: unknown; count: number }>>`
      SELECT source, COALESCE(SUM(revenue), 0) AS revenue, COUNT(*)::int AS count
      FROM (${this.recognizedDocuments(filters)}) AS docs
      GROUP BY source
    `;
    const sources = ['POS', 'WEBSITE', 'WHATSAPP', 'MANUAL'] as const;
    const map = new Map(rows.map((row) => [row.source, row]));
    return sources.map((source) => ({
      source,
      revenue: rawMoneyString(map.get(source)?.revenue),
      count: rawCount(map.get(source)?.count),
    }));
  }

  async topProducts(
    actor: AuthPrincipal,
    query: SalesReportQueryDto & { sort?: TopProductSort; take?: number },
  ): Promise<TopProductRow[]> {
    const { range } = await this.scope.resolve(actor, query);
    const take = query.take ?? 8;
    const sort = query.sort ?? 'revenue';
    const productFilter = query.productId ? Prisma.sql`AND product_id = ${query.productId}` : Prisma.sql``;
    const categoryFilter = query.categoryId ? Prisma.sql`AND category_id = ${query.categoryId}` : Prisma.sql``;
    const grouped = Prisma.sql`
      SELECT product_id, product_name,
             SUM(quantity)::int AS quantity,
             SUM(revenue) AS revenue,
             SUM(cogs) AS cogs,
             SUM(revenue) - SUM(cogs) AS gross_profit
      FROM (${this.productLines(actor.tenantId, range.from, range.to)}) AS lines
      WHERE 1=1 ${productFilter} ${categoryFilter}
      GROUP BY product_id, product_name
    `;
    const rows =
      sort === 'quantity'
        ? await this.prisma.$queryRaw<Array<{ product_id: string; product_name: string; quantity: unknown; revenue: unknown; cogs: unknown }>>`
            SELECT * FROM (${grouped}) AS ranked ORDER BY quantity DESC, revenue DESC LIMIT ${take}
          `
        : sort === 'profit'
          ? await this.prisma.$queryRaw<Array<{ product_id: string; product_name: string; quantity: unknown; revenue: unknown; cogs: unknown }>>`
              SELECT * FROM (${grouped}) AS ranked ORDER BY gross_profit DESC, revenue DESC LIMIT ${take}
            `
          : await this.prisma.$queryRaw<Array<{ product_id: string; product_name: string; quantity: unknown; revenue: unknown; cogs: unknown }>>`
              SELECT * FROM (${grouped}) AS ranked ORDER BY revenue DESC, quantity DESC LIMIT ${take}
            `;
    return rows.map((row): TopProductRow => {
      const profit = profitability(rawMoney(row.revenue), rawMoney(row.cogs));
      return {
        productId: row.product_id,
        productName: row.product_name,
        quantity: rawCount(row.quantity),
        ...profit,
      };
    });
  }

  private defaultGranularity(from: Date, to: Date): RevenueGranularity {
    const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1);
    if (days <= 14) {
      return 'daily';
    }
    if (days <= 90) {
      return 'weekly';
    }
    return 'monthly';
  }

  private bucketLabel(bucket: Date, granularity: RevenueGranularity, timeZone: string): string {
    const ymd = ymdInTimeZone(bucket, timeZone);
    if (granularity === 'monthly') {
      return new Intl.DateTimeFormat('en-IN', { timeZone, month: 'short', year: 'numeric' }).format(bucket);
    }
    if (granularity === 'weekly') {
      return `Week of ${ymd.day}/${ymd.month}`;
    }
    return new Intl.DateTimeFormat('en-IN', { timeZone, weekday: 'short', day: 'numeric', month: 'short' }).format(
      bucket,
    );
  }

  private lineFilters(tenantId: string, from: Date, to: Date, query: SalesReportQueryDto): DocumentFilters {
    return {
      tenantId,
      from,
      to,
      source: query.source,
      cashierId: query.cashierId,
      customerId: query.customerId,
      paymentMethod: query.paymentMethod,
      productId: query.productId,
      categoryId: query.categoryId,
      status: query.status,
    };
  }

  private recognizedDocuments(filters: DocumentFilters): Prisma.Sql {
    const sourceFilter = filters.source ? Prisma.sql`AND recognized.source = ${filters.source}` : Prisma.sql``;
    const cashierFilter = filters.cashierId ? Prisma.sql`AND recognized.cashier_id = ${filters.cashierId}` : Prisma.sql``;
    const customerFilter = filters.customerId
      ? Prisma.sql`AND recognized.customer_id = ${filters.customerId}`
      : Prisma.sql``;
    const paymentFilter = filters.paymentMethod
      ? Prisma.sql`AND recognized.payment_method = ${filters.paymentMethod}`
      : Prisma.sql``;
    const statusFilter = filters.status ? Prisma.sql`AND recognized.status = ${filters.status}` : Prisma.sql``;
    const byLine = Boolean(filters.productId || filters.categoryId);
    const productFilter = filters.productId ? Prisma.sql`AND pv.product_id = ${filters.productId}` : Prisma.sql``;
    const categoryFilter = filters.categoryId ? Prisma.sql`AND p.category_id = ${filters.categoryId}` : Prisma.sql``;

    const saleSelect = byLine
      ? Prisma.sql`
          s.id, s.invoice_number AS reference, s.created_at,
          COALESCE(o.source::text, 'POS') AS source, s.cashier_id, cashier.name AS cashier_name,
          s.customer_id, customer.name AS customer_name, pay.method::text AS payment_method, s.status::text AS status,
          COALESCE(SUM(si.quantity), 0) AS quantity, COALESCE(SUM(si.total), 0) AS revenue,
          COALESCE(SUM(si.discount), 0) AS discount, COALESCE(SUM(si.tax), 0) AS tax,
          COALESCE(SUM(si.cost_price * si.quantity), 0) AS cogs
        `
      : Prisma.sql`
          s.id, s.invoice_number AS reference, s.created_at,
          COALESCE(o.source::text, 'POS') AS source, s.cashier_id, cashier.name AS cashier_name,
          s.customer_id, customer.name AS customer_name, pay.method::text AS payment_method, s.status::text AS status,
          COALESCE((SELECT SUM(si.quantity) FROM sale_items si WHERE si.sale_id = s.id), 0) AS quantity,
          s.total AS revenue, s.discount, s.tax,
          COALESCE((SELECT SUM(si.cost_price * si.quantity) FROM sale_items si WHERE si.sale_id = s.id), 0) AS cogs
        `;
    const saleJoins = byLine
      ? Prisma.sql`
          INNER JOIN sale_items si ON si.sale_id = s.id
          INNER JOIN product_variants pv ON pv.id = si.product_variant_id
          INNER JOIN products p ON p.id = pv.product_id
        `
      : Prisma.sql``;
    const saleGroup = byLine
      ? Prisma.sql`GROUP BY s.id, o.source, cashier.name, customer.name, pay.method`
      : Prisma.sql``;

    const orderSelect = byLine
      ? Prisma.sql`
          o.id, o.order_number AS reference, COALESCE(o.completed_at, o.created_at) AS created_at,
          o.source::text AS source, o.created_by AS cashier_id, creator.name AS cashier_name,
          o.customer_id, customer.name AS customer_name, pay.method::text AS payment_method, o.status::text AS status,
          COALESCE(SUM(oi.quantity), 0) AS quantity, COALESCE(SUM(oi.total), 0) AS revenue,
          COALESCE(SUM(oi.discount), 0) AS discount, COALESCE(SUM(oi.tax), 0) AS tax,
          COALESCE(SUM(oi.cost_price * oi.quantity), 0) AS cogs
        `
      : Prisma.sql`
          o.id, o.order_number AS reference, COALESCE(o.completed_at, o.created_at) AS created_at,
          o.source::text AS source, o.created_by AS cashier_id, creator.name AS cashier_name,
          o.customer_id, customer.name AS customer_name, pay.method::text AS payment_method, o.status::text AS status,
          COALESCE((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = o.id), 0) AS quantity,
          o.total AS revenue, o.discount, o.tax,
          COALESCE((SELECT SUM(oi.cost_price * oi.quantity) FROM order_items oi WHERE oi.order_id = o.id), 0) AS cogs
        `;
    const orderJoins = byLine
      ? Prisma.sql`
          INNER JOIN order_items oi ON oi.order_id = o.id
          INNER JOIN product_variants pv ON pv.id = oi.product_variant_id
          INNER JOIN products p ON p.id = pv.product_id
        `
      : Prisma.sql``;
    const orderGroup = byLine
      ? Prisma.sql`GROUP BY o.id, creator.name, customer.name, pay.method`
      : Prisma.sql``;

    return Prisma.sql`
      SELECT * FROM (
        SELECT ${saleSelect}
        FROM sales s
        LEFT JOIN orders o ON o.sale_id = s.id
        LEFT JOIN users cashier ON cashier.id = s.cashier_id
        LEFT JOIN customers customer ON customer.id = s.customer_id
        LEFT JOIN LATERAL (
          SELECT method FROM payments
          WHERE sale_id = s.id AND status IN ('COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED')
          ORDER BY created_at ASC
          LIMIT 1
        ) pay ON TRUE
        ${saleJoins}
        WHERE s.tenant_id = ${filters.tenantId}
          AND s.status NOT IN ('VOIDED', 'CANCELLED')
          AND s.created_at >= ${filters.from}
          AND s.created_at <= ${filters.to}
          ${productFilter}
          ${categoryFilter}
        ${saleGroup}

        UNION ALL

        SELECT ${orderSelect}
        FROM orders o
        LEFT JOIN users creator ON creator.id = o.created_by
        LEFT JOIN customers customer ON customer.id = o.customer_id
        LEFT JOIN LATERAL (
          SELECT method FROM payments
          WHERE order_id = o.id AND status IN ('COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED')
          ORDER BY created_at ASC
          LIMIT 1
        ) pay ON TRUE
        ${orderJoins}
        WHERE o.tenant_id = ${filters.tenantId}
          AND o.status = 'COMPLETED'
          AND o.sale_id IS NULL
          AND COALESCE(o.completed_at, o.created_at) >= ${filters.from}
          AND COALESCE(o.completed_at, o.created_at) <= ${filters.to}
          ${productFilter}
          ${categoryFilter}
        ${orderGroup}
      ) AS recognized
      WHERE 1=1 ${sourceFilter} ${cashierFilter} ${customerFilter} ${paymentFilter} ${statusFilter}
    `;
  }

  private productLines(tenantId: string, from: Date, to: Date): Prisma.Sql {
    return Prisma.sql`
      SELECT pv.product_id, p.name AS product_name, p.category_id,
             si.quantity, si.total AS revenue, (si.cost_price * si.quantity) AS cogs
      FROM sale_items si
      INNER JOIN sales s ON s.id = si.sale_id
      INNER JOIN product_variants pv ON pv.id = si.product_variant_id
      INNER JOIN products p ON p.id = pv.product_id
      WHERE s.tenant_id = ${tenantId}
        AND s.status NOT IN ('VOIDED', 'CANCELLED')
        AND s.created_at >= ${from}
        AND s.created_at <= ${to}

      UNION ALL

      SELECT pv.product_id, p.name AS product_name, p.category_id,
             oi.quantity, oi.total AS revenue, (oi.cost_price * oi.quantity) AS cogs
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      INNER JOIN product_variants pv ON pv.id = oi.product_variant_id
      INNER JOIN products p ON p.id = pv.product_id
      WHERE o.tenant_id = ${tenantId}
        AND o.status = 'COMPLETED'
        AND o.sale_id IS NULL
        AND COALESCE(o.completed_at, o.created_at) >= ${from}
        AND COALESCE(o.completed_at, o.created_at) <= ${to}
    `;
  }
}
