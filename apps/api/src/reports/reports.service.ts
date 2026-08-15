import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentStatus, Prisma, SaleStatus } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthPrincipal } from '../common/context/request-context';
import { money, moneyString, roundMoney } from '../pos/pos-money';
import { PAYABLE_PURCHASE_STATUSES } from '../purchases/purchase-money';
import { toPaginationArgs, toPaginationMeta } from '../common/dto/pagination-query.dto';
import type { PaymentMethod } from '@jersey-commerce/types';
import type { PurchaseReportQueryDto, ReportQueryDto } from './dto/report-query.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async salesSummary(actor: AuthPrincipal, query: ReportQueryDto) {
    const createdAt = this.dateRange(query.from, query.to);
    const where: Prisma.SaleWhereInput = {
      tenantId: actor.tenantId,
      status: { notIn: [SaleStatus.VOIDED] },
      ...(query.cashierId ? { cashierId: query.cashierId } : {}),
      ...(query.sessionId ? { posSessionId: query.sessionId } : {}),
      ...(query.paymentMethod ? { payments: { some: { method: query.paymentMethod } } } : {}),
      ...(createdAt ? { createdAt } : {}),
    };
    const [aggregate, grouped] = await this.prisma.$transaction([
      this.prisma.sale.aggregate({
        where,
        _count: { _all: true },
        _sum: { subtotal: true, discount: true, tax: true, total: true },
      }),
      this.prisma.sale.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
        _sum: { total: true },
      }),
    ]);
    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count: aggregate._count._all,
      subtotal: moneyString(aggregate._sum.subtotal ?? money(0)),
      discount: moneyString(aggregate._sum.discount ?? money(0)),
      tax: moneyString(aggregate._sum.tax ?? money(0)),
      total: moneyString(aggregate._sum.total ?? money(0)),
      byStatus: grouped.map((row) => ({
        status: row.status,
        count: row._count._all,
        total: moneyString(row._sum.total ?? money(0)),
      })),
    };
  }

  async paymentSummary(actor: AuthPrincipal, query: ReportQueryDto) {
    const createdAt = this.dateRange(query.from, query.to);
    const collectedWhere: Prisma.PaymentWhereInput = {
      tenantId: actor.tenantId,
      status: { in: [PaymentStatus.COMPLETED, PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED] },
      ...(query.paymentMethod ? { method: query.paymentMethod } : {}),
      ...(query.cashierId ? { OR: [{ createdById: query.cashierId }, { sale: { is: { cashierId: query.cashierId } } }] } : {}),
      ...(query.sessionId ? { posSessionId: query.sessionId } : {}),
      ...(createdAt ? { createdAt } : {}),
    };
    const refundWhere: Prisma.RefundPaymentWhereInput = {
      tenantId: actor.tenantId,
      status: PaymentStatus.COMPLETED,
      ...(query.paymentMethod ? { method: query.paymentMethod } : {}),
      ...(query.sessionId ? { refund: { is: { sale: { is: { posSessionId: query.sessionId } } } } } : {}),
      ...(query.cashierId ? { refund: { is: { createdById: query.cashierId } } } : {}),
      ...(createdAt ? { createdAt } : {}),
    };
    const [collected, refunds] = await this.prisma.$transaction([
      this.prisma.payment.groupBy({
        by: ['method'],
        where: collectedWhere,
        _sum: { amount: true },
      }),
      this.prisma.refundPayment.groupBy({
        by: ['method'],
        where: refundWhere,
        _sum: { amount: true },
      }),
    ]);
    const methods: PaymentMethod[] = ['CASH', 'UPI', 'CARD', 'ONLINE', 'OTHER'];
    const collectedMap = new Map(collected.map((row) => [row.method, money(row._sum.amount?.toString() ?? '0')]));
    const refundMap = new Map(refunds.map((row) => [row.method, money(row._sum.amount?.toString() ?? '0')]));
    const rows = methods.map((method) => {
      const sales = collectedMap.get(method) ?? money(0);
      const refunded = refundMap.get(method) ?? money(0);
      return {
        method,
        sales: moneyString(sales),
        refunds: moneyString(refunded),
        net: moneyString(roundMoney(sales.sub(refunded))),
      };
    });
    const totalSales = rows.reduce((sum, row) => sum.add(money(row.sales)), money(0));
    const totalRefunds = rows.reduce((sum, row) => sum.add(money(row.refunds)), money(0));
    return {
      from: query.from ?? null,
      to: query.to ?? null,
      methods: rows,
      totalSales: moneyString(totalSales),
      totalRefunds: moneyString(totalRefunds),
      totalNet: moneyString(roundMoney(totalSales.sub(totalRefunds))),
    };
  }

  async sessionSummary(actor: AuthPrincipal, query: ReportQueryDto) {
    if (!query.sessionId) {
      throw new BadRequestException('sessionId is required for session summary.');
    }
    const session = await this.prisma.posSession.findFirst({
      where: { id: query.sessionId, tenantId: actor.tenantId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!session) {
      throw new BadRequestException('POS session not found.');
    }
    const payments = await this.paymentSummary(actor, { ...query, sessionId: session.id });
    const cash = payments.methods.find((row) => row.method === 'CASH');
    const openingCash = money(session.openingCash.toString());
    const cashSales = money(cash?.sales ?? '0');
    const cashRefunds = money(cash?.refunds ?? '0');
    const expectedCash = roundMoney(openingCash.add(cashSales).sub(cashRefunds));
    return {
      sessionId: session.id,
      status: session.status,
      cashier: session.user,
      openedAt: session.openedAt.toISOString(),
      closedAt: session.closedAt?.toISOString() ?? null,
      openingCash: moneyString(openingCash),
      cashSales: moneyString(cashSales),
      cashRefunds: moneyString(cashRefunds),
      expectedCash: moneyString(expectedCash),
      closingCash: session.closingCash ? moneyString(session.closingCash) : null,
      methods: payments.methods,
      totalSales: payments.totalSales,
      totalRefunds: payments.totalRefunds,
      totalNet: payments.totalNet,
    };
  }

  async purchasesSummary(actor: AuthPrincipal, query: PurchaseReportQueryDto) {
    const createdAt = this.dateRange(query.from, query.to);
    const where: Prisma.PurchaseWhereInput = {
      tenantId: actor.tenantId,
      status: { in: PAYABLE_PURCHASE_STATUSES },
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(createdAt ? { createdAt } : {}),
    };
    const [aggregate, grouped, quantity] = await this.prisma.$transaction([
      this.prisma.purchase.aggregate({
        where,
        _count: { _all: true },
        _sum: { subtotal: true, discount: true, tax: true, total: true },
      }),
      this.prisma.purchase.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
        _sum: { total: true },
      }),
      this.prisma.purchaseItem.aggregate({
        where: { tenantId: actor.tenantId, purchase: { is: where } },
        _sum: { orderedQuantity: true, receivedQuantity: true },
      }),
    ]);
    return {
      from: query.from ?? null,
      to: query.to ?? null,
      count: aggregate._count._all,
      subtotal: moneyString(aggregate._sum.subtotal ?? money(0)),
      discount: moneyString(aggregate._sum.discount ?? money(0)),
      tax: moneyString(aggregate._sum.tax ?? money(0)),
      total: moneyString(aggregate._sum.total ?? money(0)),
      orderedQuantity: quantity._sum.orderedQuantity ?? 0,
      receivedQuantity: quantity._sum.receivedQuantity ?? 0,
      byStatus: grouped.map((row) => ({
        status: row.status,
        count: row._count._all,
        total: moneyString(row._sum.total ?? money(0)),
      })),
    };
  }

  async supplierBalances(actor: AuthPrincipal, query: PurchaseReportQueryDto) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const createdAt = this.dateRange(query.from, query.to);
    const [suppliers, totalItems] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where: { tenantId: actor.tenantId },
        orderBy: { name: 'asc' },
        skip,
        take,
        select: { id: true, name: true, status: true },
      }),
      this.prisma.supplier.count({ where: { tenantId: actor.tenantId } }),
    ]);
    const supplierIds = suppliers.map((supplier) => supplier.id);
    const [purchases, payments] = await this.prisma.$transaction([
      this.prisma.purchase.groupBy({
        by: ['supplierId'],
        where: {
          tenantId: actor.tenantId,
          supplierId: { in: supplierIds },
          status: { in: PAYABLE_PURCHASE_STATUSES },
          ...(createdAt ? { createdAt } : {}),
        },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.supplierPayment.groupBy({
        by: ['supplierId'],
        where: {
          tenantId: actor.tenantId,
          supplierId: { in: supplierIds },
          status: PaymentStatus.COMPLETED,
          ...(createdAt ? { createdAt } : {}),
        },
        _sum: { amount: true },
      }),
    ]);
    const purchaseMap = new Map(purchases.map((row) => [row.supplierId, row]));
    const paymentMap = new Map(payments.map((row) => [row.supplierId, row]));
    return {
      items: suppliers.map((supplier) => {
        const purchased = money(purchaseMap.get(supplier.id)?._sum.total?.toString() ?? '0');
        const paid = money(paymentMap.get(supplier.id)?._sum.amount?.toString() ?? '0');
        return {
          supplierId: supplier.id,
          name: supplier.name,
          status: supplier.status,
          purchaseCount: purchaseMap.get(supplier.id)?._count._all ?? 0,
          totalPurchases: moneyString(purchased),
          totalPaid: moneyString(paid),
          outstandingAmount: moneyString(roundMoney(purchased.sub(paid))),
        };
      }),
      meta: toPaginationMeta(page, pageSize, totalItems),
    };
  }

  async topSuppliers(actor: AuthPrincipal, query: PurchaseReportQueryDto) {
    const { page, pageSize, skip, take } = toPaginationArgs(query);
    const createdAt = this.dateRange(query.from, query.to);
    const grouped = await this.prisma.purchase.groupBy({
      by: ['supplierId'],
      where: {
        tenantId: actor.tenantId,
        status: { in: PAYABLE_PURCHASE_STATUSES },
        ...(createdAt ? { createdAt } : {}),
      },
      _sum: { total: true },
      _count: { _all: true },
    });
    const quantities = await this.prisma.purchaseItem.groupBy({
      by: ['purchaseId'],
      where: {
        tenantId: actor.tenantId,
        purchase: {
          is: {
            tenantId: actor.tenantId,
            status: { in: PAYABLE_PURCHASE_STATUSES },
            ...(createdAt ? { createdAt } : {}),
          },
        },
      },
      _sum: { orderedQuantity: true, receivedQuantity: true },
    });
    const purchases = await this.prisma.purchase.findMany({
      where: { tenantId: actor.tenantId, id: { in: quantities.map((row) => row.purchaseId) } },
      select: { id: true, supplierId: true },
    });
    const qtyBySupplier = new Map<string, { ordered: number; received: number }>();
    const purchaseSupplier = new Map(purchases.map((row) => [row.id, row.supplierId]));
    for (const row of quantities) {
      const supplierId = purchaseSupplier.get(row.purchaseId);
      if (!supplierId) {
        continue;
      }
      const current = qtyBySupplier.get(supplierId) ?? { ordered: 0, received: 0 };
      current.ordered += row._sum.orderedQuantity ?? 0;
      current.received += row._sum.receivedQuantity ?? 0;
      qtyBySupplier.set(supplierId, current);
    }
    const payments = await this.prisma.supplierPayment.groupBy({
      by: ['supplierId'],
      where: {
        tenantId: actor.tenantId,
        status: PaymentStatus.COMPLETED,
        ...(createdAt ? { createdAt } : {}),
      },
      _sum: { amount: true },
    });
    const paymentMap = new Map(payments.map((row) => [row.supplierId, money(row._sum.amount?.toString() ?? '0')]));
    const suppliers = await this.prisma.supplier.findMany({
      where: { tenantId: actor.tenantId, id: { in: grouped.map((row) => row.supplierId) } },
      select: { id: true, name: true },
    });
    const names = new Map(suppliers.map((row) => [row.id, row.name]));
    const rows = grouped.map((row) => {
      const totalPurchases = money(row._sum.total?.toString() ?? '0');
      const paid = paymentMap.get(row.supplierId) ?? money(0);
      const qty = qtyBySupplier.get(row.supplierId) ?? { ordered: 0, received: 0 };
      return {
        supplierId: row.supplierId,
        name: names.get(row.supplierId) ?? 'Unknown supplier',
        purchaseCount: row._count._all,
        totalPurchases: moneyString(totalPurchases),
        totalPaid: moneyString(paid),
        outstandingAmount: moneyString(roundMoney(totalPurchases.sub(paid))),
        orderedQuantity: qty.ordered,
        receivedQuantity: qty.received,
      };
    });
    rows.sort((a, b) => {
      if (query.sort === 'outstanding') {
        return Number(b.outstandingAmount) - Number(a.outstandingAmount);
      }
      if (query.sort === 'quantity') {
        return b.orderedQuantity - a.orderedQuantity;
      }
      return Number(b.totalPurchases) - Number(a.totalPurchases);
    });
    const totalItems = rows.length;
    const items = rows.slice(skip, skip + take);
    return {
      from: query.from ?? null,
      to: query.to ?? null,
      items,
      meta: toPaginationMeta(page, pageSize, totalItems),
    };
  }

  private dateRange(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
    if (!from && !to) {
      return undefined;
    }
    const range: Prisma.DateTimeFilter = {};
    if (from) {
      const start = new Date(from);
      if (Number.isNaN(start.getTime())) {
        throw new BadRequestException('from must be a valid ISO date.');
      }
      range.gte = start;
    }
    if (to) {
      const end = new Date(to);
      if (Number.isNaN(end.getTime())) {
        throw new BadRequestException('to must be a valid ISO date.');
      }
      range.lte = end;
    }
    return range;
  }
}
