import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  CustomerActivityItem,
  CustomerDashboardSummary,
  CustomerHistoryItem,
  InactiveCustomerRow,
  RepeatCustomerRow,
  TopCustomerRow,
} from '@jersey-commerce/types';
import { Prisma } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toPaginationArgs, toPaginationMeta } from '../common/dto/pagination-query.dto';
import {
  CRM_COUNTED_ORDER_STATUSES,
  CRM_COUNTED_SALE_STATUSES,
  computePurchaseMetrics,
  daysSince,
  moneyNumber,
  moneyString,
  netPurchaseAmount,
  type CountedPurchase,
} from './customer-metrics';
import { resolveCrmSettings } from './crm-settings';
import { segmentsFor } from './customer-segment';
import { toCustomerSummary, toIso } from './customer.mapper';
import type { CustomerReportQueryDto, CustomerHistoryQueryDto } from './dto/customer-query.dto';

type DateRange = { from?: Date; to?: Date };

@Injectable()
export class CustomerInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  parseDateRange(from?: string, to?: string): DateRange {
    return { from: this.parseDate(from, false), to: this.parseDate(to, true) };
  }

  async purchasesForCustomer(tenantId: string, customerId: string, range?: DateRange): Promise<CountedPurchase[]> {
    const createdAt = this.createdAtFilter(range);
    const [sales, orders] = await Promise.all([
      this.prisma.sale.findMany({
        where: { tenantId, customerId, status: { in: [...CRM_COUNTED_SALE_STATUSES] }, ...(createdAt ? { createdAt } : {}) },
        select: {
          total: true,
          createdAt: true,
          items: { select: { quantity: true } },
          refunds: {
            where: { status: 'COMPLETED' },
            select: { amount: true, items: { select: { quantity: true } } },
          },
        },
      }),
      this.prisma.order.findMany({
        where: { tenantId, customerId, status: { in: [...CRM_COUNTED_ORDER_STATUSES] }, ...(createdAt ? { createdAt } : {}) },
        select: { total: true, createdAt: true, items: { select: { quantity: true } } },
      }),
    ]);

    return [
      ...sales.map((sale) => {
        const refunded = sale.refunds.reduce((sum, refund) => sum + moneyNumber(refund.amount), 0);
        const refundedQty = sale.refunds.reduce(
          (sum, refund) => sum + refund.items.reduce((inner, item) => inner + item.quantity, 0),
          0,
        );
        return {
          total: netPurchaseAmount(moneyNumber(sale.total), refunded),
          itemQuantity: Math.max(
            0,
            sale.items.reduce((sum, item) => sum + item.quantity, 0) - refundedQty,
          ),
          createdAt: sale.createdAt,
        };
      }),
      ...orders.map((order) => ({
        total: moneyNumber(order.total),
        itemQuantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
        createdAt: order.createdAt,
      })),
    ];
  }

  async metricsForCustomer(tenantId: string, customerId: string, range?: DateRange) {
    return computePurchaseMetrics(await this.purchasesForCustomer(tenantId, customerId, range));
  }

  async history(tenantId: string, customerId: string, query: CustomerHistoryQueryDto) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const [sales, orders] = await Promise.all([
      this.prisma.sale.findMany({
        where: { tenantId, customerId },
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          status: true,
          createdAt: true,
          items: { select: { quantity: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.findMany({
        where: { tenantId, customerId },
        select: {
          id: true,
          orderNumber: true,
          source: true,
          total: true,
          status: true,
          createdAt: true,
          items: { select: { quantity: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const items: CustomerHistoryItem[] = [
      ...sales.map((sale) => ({
        id: sale.id,
        type: 'POS_SALE' as const,
        source: 'POS' as const,
        reference: sale.invoiceNumber,
        date: toIso(sale.createdAt),
        total: moneyString(moneyNumber(sale.total)),
        status: sale.status,
        itemCount: sale.items.reduce((sum, item) => sum + item.quantity, 0),
      })),
      ...orders.map((order) => ({
        id: order.id,
        type: 'ORDER' as const,
        source: order.source,
        reference: order.orderNumber,
        date: toIso(order.createdAt),
        total: moneyString(moneyNumber(order.total)),
        status: order.status,
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      items: items.slice(skip, skip + take),
      meta: toPaginationMeta(page, pageSize, items.length),
    };
  }

  async activity(tenantId: string, customerId: string, createdAt: Date, query: CustomerHistoryQueryDto) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const [sales, orders, notes, tags] = await Promise.all([
      this.prisma.sale.findMany({
        where: { tenantId, customerId },
        select: { invoiceNumber: true, total: true, status: true, createdAt: true },
      }),
      this.prisma.order.findMany({
        where: { tenantId, customerId },
        select: { orderNumber: true, source: true, total: true, status: true, createdAt: true },
      }),
      this.prisma.customerNote.findMany({
        where: { tenantId, customerId },
        select: { createdAt: true },
      }),
      this.prisma.customerTag.findMany({
        where: { tenantId, customerId },
        select: { createdAt: true, tag: { select: { name: true } } },
      }),
    ]);

    const items: CustomerActivityItem[] = [
      { at: toIso(createdAt), type: 'CUSTOMER_CREATED' as const, title: 'Customer created' },
      ...sales.map((sale) => ({
        at: toIso(sale.createdAt),
        type: 'POS_SALE' as const,
        title: 'POS purchase',
        reference: sale.invoiceNumber,
        amount: moneyString(moneyNumber(sale.total)),
        status: sale.status,
        source: 'POS',
      })),
      ...orders.map((order) => ({
        at: toIso(order.createdAt),
        type: 'ORDER' as const,
        title: `${order.source.charAt(0)}${order.source.slice(1).toLowerCase()} order`,
        reference: order.orderNumber,
        amount: moneyString(moneyNumber(order.total)),
        status: order.status,
        source: order.source,
      })),
      ...notes.map((note) => ({
        at: toIso(note.createdAt),
        type: 'NOTE_ADDED' as const,
        title: 'Customer note added',
      })),
      ...tags.map((row) => ({
        at: toIso(row.createdAt),
        type: 'TAG_ADDED' as const,
        title: `Tag added: ${row.tag.name}`,
      })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return {
      items: items.slice(skip, skip + take),
      meta: toPaginationMeta(page, pageSize, items.length),
    };
  }

  async dashboard(tenantId: string, query: CustomerReportQueryDto): Promise<CustomerDashboardSummary> {
    const settings = resolveCrmSettings({
      highValueThreshold: query.highValueThreshold,
      inactiveDays: query.inactiveDays,
    });
    const now = new Date();
    const range = this.parseDateRange(query.from, query.to);
    const periodStart = range.from ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = range.to ?? now;
    const aggregates = await this.aggregatesByCustomer(tenantId);
    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      select: { id: true, createdAt: true },
    });

    let newInPeriod = 0;
    let repeatCustomers = 0;
    let highValueCustomers = 0;
    let inactiveCustomers = 0;

    for (const customer of customers) {
      const stats = aggregates.get(customer.id);
      const completedPurchaseCount = stats?.purchaseCount ?? 0;
      const totalSpent = stats?.totalSpent ?? 0;
      const lastPurchaseAt = stats?.lastPurchaseAt ?? null;
      if (customer.createdAt >= periodStart && customer.createdAt <= periodEnd) {
        newInPeriod += 1;
      }
      const { segments } = segmentsFor({
        completedPurchaseCount,
        totalSpent,
        lastPurchaseAt,
        createdAt: customer.createdAt,
        now,
        settings,
      });
      if (segments.includes('REPEAT')) {
        repeatCustomers += 1;
      }
      if (segments.includes('HIGH_VALUE')) {
        highValueCustomers += 1;
      }
      if (segments.includes('INACTIVE')) {
        inactiveCustomers += 1;
      }
    }

    return {
      totalCustomers: customers.length,
      newInPeriod,
      repeatCustomers,
      highValueCustomers,
      inactiveCustomers,
      settings: {
        highValueThreshold: moneyString(settings.highValueThreshold),
        inactiveDays: settings.inactiveDays,
        newPurchaseCount: settings.newPurchaseCount,
        repeatPurchaseCount: settings.repeatPurchaseCount,
      },
    };
  }

  async top(tenantId: string, query: CustomerReportQueryDto) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const range = this.parseDateRange(query.from, query.to);
    const sort = query.sort ?? 'totalSpent';
    const rows = [...(await this.aggregatesByCustomer(tenantId, range)).entries()].filter(
      ([, stats]) => stats.purchaseCount > 0,
    );
    rows.sort((a, b) => {
      if (sort === 'purchaseCount') {
        return b[1].purchaseCount - a[1].purchaseCount || b[1].totalSpent - a[1].totalSpent;
      }
      return b[1].totalSpent - a[1].totalSpent || b[1].purchaseCount - a[1].purchaseCount;
    });
    const pageRows = rows.slice(skip, skip + take);
    const customers = await this.customersByIds(
      tenantId,
      pageRows.map(([id]) => id),
    );
    const items: TopCustomerRow[] = pageRows.map(([id, stats], index) => ({
      rank: skip + index + 1,
      customer: toCustomerSummary(customers.get(id)!),
      totalSpent: moneyString(stats.totalSpent),
      purchaseCount: stats.purchaseCount,
      lastPurchaseAt: stats.lastPurchaseAt ? toIso(stats.lastPurchaseAt) : null,
    }));
    return { items, meta: toPaginationMeta(page, pageSize, rows.length) };
  }

  async repeat(tenantId: string, query: CustomerReportQueryDto) {
    const settings = resolveCrmSettings({
      highValueThreshold: query.highValueThreshold,
      inactiveDays: query.inactiveDays,
    });
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const range = this.parseDateRange(query.from, query.to);
    const rows = [...(await this.aggregatesByCustomer(tenantId, range)).entries()]
      .filter(([, stats]) => stats.purchaseCount >= settings.repeatPurchaseCount)
      .sort((a, b) => b[1].purchaseCount - a[1].purchaseCount || b[1].totalSpent - a[1].totalSpent);
    const pageRows = rows.slice(skip, skip + take);
    const customers = await this.customersByIds(
      tenantId,
      pageRows.map(([id]) => id),
    );
    const items: RepeatCustomerRow[] = pageRows.map(([id, stats]) => ({
      customer: toCustomerSummary(customers.get(id)!),
      purchaseCount: stats.purchaseCount,
      totalSpent: moneyString(stats.totalSpent),
      lastPurchaseAt: stats.lastPurchaseAt ? toIso(stats.lastPurchaseAt) : null,
    }));
    return { items, meta: toPaginationMeta(page, pageSize, rows.length) };
  }

  async inactive(tenantId: string, query: CustomerReportQueryDto) {
    const settings = resolveCrmSettings({
      highValueThreshold: query.highValueThreshold,
      inactiveDays: query.inactiveDays,
    });
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const now = new Date();
    const aggregates = await this.aggregatesByCustomer(tenantId);
    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    const rows: InactiveCustomerRow[] = [];
    for (const customer of customers) {
      const stats = aggregates.get(customer.id);
      const lastPurchaseAt = stats?.lastPurchaseAt ?? null;
      const { segments } = segmentsFor({
        completedPurchaseCount: stats?.purchaseCount ?? 0,
        totalSpent: stats?.totalSpent ?? 0,
        lastPurchaseAt,
        createdAt: customer.createdAt,
        now,
        settings,
      });
      if (!segments.includes('INACTIVE')) {
        continue;
      }
      const anchor = lastPurchaseAt ?? customer.createdAt;
      rows.push({
        customer: toCustomerSummary(customer),
        lastPurchaseAt: lastPurchaseAt ? toIso(lastPurchaseAt) : null,
        totalSpent: moneyString(stats?.totalSpent ?? 0),
        daysInactive: daysSince(anchor, now),
      });
    }
    rows.sort((a, b) => b.daysInactive - a.daysInactive);
    return {
      items: rows.slice(skip, skip + take),
      meta: toPaginationMeta(page, pageSize, rows.length),
    };
  }

  private async aggregatesByCustomer(tenantId: string, range?: DateRange) {
    const createdAt = this.createdAtFilter(range);
    const [sales, orders, refunds] = await Promise.all([
      this.prisma.sale.groupBy({
        by: ['customerId'],
        where: {
          tenantId,
          customerId: { not: null },
          status: { in: [...CRM_COUNTED_SALE_STATUSES] },
          ...(createdAt ? { createdAt } : {}),
        },
        _sum: { total: true },
        _count: { _all: true },
        _min: { createdAt: true },
        _max: { createdAt: true },
      }),
      this.prisma.order.groupBy({
        by: ['customerId'],
        where: {
          tenantId,
          customerId: { not: null },
          status: { in: [...CRM_COUNTED_ORDER_STATUSES] },
          ...(createdAt ? { createdAt } : {}),
        },
        _sum: { total: true },
        _count: { _all: true },
        _min: { createdAt: true },
        _max: { createdAt: true },
      }),
      this.prisma.refund.findMany({
        where: {
          tenantId,
          status: 'COMPLETED',
          sale: {
            customerId: { not: null },
            status: { in: [...CRM_COUNTED_SALE_STATUSES] },
            ...(createdAt ? { createdAt } : {}),
          },
        },
        select: { amount: true, sale: { select: { customerId: true } } },
      }),
    ]);

    const refundedByCustomer = new Map<string, number>();
    for (const refund of refunds) {
      const customerId = refund.sale.customerId;
      if (!customerId) {
        continue;
      }
      refundedByCustomer.set(customerId, (refundedByCustomer.get(customerId) ?? 0) + moneyNumber(refund.amount));
    }

    const merged = new Map<
      string,
      { totalSpent: number; purchaseCount: number; firstPurchaseAt: Date | null; lastPurchaseAt: Date | null }
    >();
    const apply = (
      customerId: string | null,
      total: number,
      count: number,
      first: Date | null,
      last: Date | null,
    ) => {
      if (!customerId) {
        return;
      }
      const current = merged.get(customerId) ?? {
        totalSpent: 0,
        purchaseCount: 0,
        firstPurchaseAt: null,
        lastPurchaseAt: null,
      };
      current.totalSpent = netPurchaseAmount(current.totalSpent + total, 0);
      current.purchaseCount += count;
      if (first && (!current.firstPurchaseAt || first < current.firstPurchaseAt)) {
        current.firstPurchaseAt = first;
      }
      if (last && (!current.lastPurchaseAt || last > current.lastPurchaseAt)) {
        current.lastPurchaseAt = last;
      }
      merged.set(customerId, current);
    };

    for (const row of sales) {
      apply(
        row.customerId,
        moneyNumber(row._sum.total),
        row._count._all,
        row._min.createdAt,
        row._max.createdAt,
      );
    }
    for (const row of orders) {
      apply(
        row.customerId,
        moneyNumber(row._sum.total),
        row._count._all,
        row._min.createdAt,
        row._max.createdAt,
      );
    }
    for (const [customerId, refunded] of refundedByCustomer) {
      const current = merged.get(customerId);
      if (!current) {
        continue;
      }
      current.totalSpent = netPurchaseAmount(current.totalSpent, refunded);
    }
    return merged;
  }

  private async customersByIds(tenantId: string, ids: string[]) {
    if (ids.length === 0) {
      return new Map<string, Awaited<ReturnType<PrismaService['customer']['findMany']>>[number]>();
    }
    const records = await this.prisma.customer.findMany({ where: { tenantId, id: { in: ids } } });
    return new Map(records.map((record) => [record.id, record]));
  }

  private createdAtFilter(range?: DateRange): Prisma.DateTimeFilter | undefined {
    if (!range?.from && !range?.to) {
      return undefined;
    }
    return {
      ...(range.from ? { gte: range.from } : {}),
      ...(range.to ? { lte: range.to } : {}),
    };
  }

  private parseDate(value: string | undefined, endOfDay: boolean): Date | undefined {
    if (!value) {
      return undefined;
    }
    const parsed = value.length === 10 ? new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`) : new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('from and to must be valid dates.');
    }
    return parsed;
  }
}
