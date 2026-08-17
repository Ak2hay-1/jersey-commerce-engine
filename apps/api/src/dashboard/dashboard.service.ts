import { ForbiddenException, Injectable } from '@nestjs/common';
import type { DashboardSummary, DashboardWidgets, RecentOrderRow, RecentSaleRow } from '@jersey-commerce/types';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthPrincipal } from '../common/context/request-context';
import { SalesReportService } from '../reports/sales-report.service';
import { InventoryReportService } from '../reports/inventory-report.service';
import { PurchaseReportService } from '../reports/purchase-report.service';
import { CustomerReportService } from '../reports/customer-report.service';
import { PaymentReportService } from '../reports/payment-report.service';
import { ExpenseReportService } from '../reports/expense-report.service';
import { ReportingCacheService } from '../reports/reporting-cache.service';
import { ReportingScopeService } from '../reports/reporting-scope.service';
import { can } from '../reports/rbac';
import { money, moneyString, roundMoney } from '../pos/pos-money';
import type { DashboardQueryDto } from '../reports/dto/report-query.dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: ReportingCacheService,
    private readonly scope: ReportingScopeService,
    private readonly sales: SalesReportService,
    private readonly inventory: InventoryReportService,
    private readonly purchases: PurchaseReportService,
    private readonly customers: CustomerReportService,
    private readonly payments: PaymentReportService,
    private readonly expenses: ExpenseReportService,
  ) {}

  async summary(actor: AuthPrincipal, query: DashboardQueryDto): Promise<DashboardSummary> {
    if (!can(actor, 'dashboard.read')) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
    const { dto } = await this.scope.resolve(actor, query);
    const cacheKey = this.cache.key(actor.tenantId, 'summary', [dto.preset, dto.from, dto.to, actor.userId]);
    return this.cache.remember(cacheKey, async () => {
      const canFinance = can(actor, 'reports.read');
      const canSales = can(actor, 'sales.read') || canFinance;
      const canOrders = can(actor, 'orders.read') || canSales;
      const canCustomers = can(actor, 'customers.read');
      const canInventory = can(actor, 'inventory.read');
      const canPurchases = can(actor, 'purchases.read') || can(actor, 'suppliers.read');
      const canExpenses = can(actor, 'expenses.read');

      const totals = canSales ? await this.sales.profitabilityTotals(actor, query) : null;
      const channels = canSales ? await this.sales.salesByChannel(actor, query) : [];
      const paymentReport = can(actor, 'payments.read') || canFinance ? await this.payments.report(actor, query) : null;
      const expenseReport = canExpenses ? await this.expenses.report(actor, { ...query, pageSize: 8 }) : null;
      const customerSnap = canCustomers ? await this.customers.periodSnapshot(actor, query) : null;
      const inventoryReport = canInventory ? await this.inventory.report(actor, { pageSize: 1 }) : null;
      const purchaseReport = canPurchases
        ? await this.purchases.report(actor, { from: query.from, to: query.to, pageSize: 1 })
        : null;
      const outstanding = canPurchases ? await this.purchases.outstandingBalance(actor) : null;

      const aov =
        totals && totals.orderCount > 0
          ? moneyString(roundMoney(money(totals.revenue).div(totals.orderCount)))
          : totals
            ? '0.00'
            : null;

      return {
        range: dto,
        kpis: {
          revenue: canSales ? (totals?.revenue ?? '0.00') : null,
          grossProfit: canFinance ? (totals?.grossProfit ?? '0.00') : null,
          cogs: canFinance ? (totals?.cogs ?? '0.00') : null,
          marginPercent: canFinance ? (totals?.marginPercent ?? '0.00') : null,
          orders: canOrders ? (totals?.orderCount ?? 0) : null,
          averageOrderValue: canSales ? aov : null,
          customers: canCustomers ? (customerSnap?.newCustomers ?? 0) : null,
          inventoryValue: canInventory ? (inventoryReport?.totals.costValue ?? '0.00') : null,
          outstandingSupplierBalance: outstanding,
          expenses: canExpenses ? (expenseReport?.totals.totalExpenses ?? '0.00') : null,
        },
        salesChannels: channels,
        payments: paymentReport ? this.payments.dashboardBreakdown(paymentReport) : [],
        expensesByCategory: expenseReport?.byCategory ?? [],
        inventory: {
          available: canInventory,
          lowStockCount: inventoryReport?.totals.lowStock ?? 0,
          outOfStockCount: inventoryReport?.totals.outOfStock ?? 0,
          inventoryValue: inventoryReport?.totals.costValue ?? '0.00',
          sellingValue: inventoryReport?.totals.sellingValue ?? '0.00',
        },
        customers: {
          available: canCustomers,
          newCustomers: customerSnap?.newCustomers ?? 0,
          repeatCustomers: customerSnap?.repeatCustomers ?? 0,
          highValueCustomers: customerSnap?.highValueCustomers ?? 0,
          inactiveCustomers: customerSnap?.inactiveCustomers ?? 0,
        },
        purchases: {
          available: canPurchases,
          purchaseCount: purchaseReport?.totals.purchaseCount ?? 0,
          purchaseTotal: purchaseReport?.totals.total ?? '0.00',
          outstandingSupplierBalance: outstanding ?? '0.00',
        },
      };
    });
  }

  async widgets(actor: AuthPrincipal, query: DashboardQueryDto): Promise<DashboardWidgets> {
    const canSales = can(actor, 'sales.read') || can(actor, 'reports.read');
    const canOrders = can(actor, 'orders.read') || canSales;
    const canInventory = can(actor, 'inventory.read');
    const [topProducts, recentSales, recentOrders, lowStock, outOfStock] = await Promise.all([
      canSales
        ? this.sales.topProducts(actor, {
            preset: query.preset,
            from: query.from,
            to: query.to,
            take: 8,
            sort: query.sort,
          })
        : Promise.resolve([]),
      canSales ? this.recentSales(actor, query) : Promise.resolve([]),
      canOrders ? this.recentOrders(actor, query) : Promise.resolve([]),
      canInventory ? this.inventory.alerts(actor, 'low', 8) : Promise.resolve([]),
      canInventory ? this.inventory.alerts(actor, 'out', 8) : Promise.resolve([]),
    ]);
    return { topProducts, recentSales, recentOrders, lowStock, outOfStock };
  }

  private async recentSales(actor: AuthPrincipal, query: DashboardQueryDto): Promise<RecentSaleRow[]> {
    const { range } = await this.scope.resolve(actor, query);
    const rows = await this.prisma.sale.findMany({
      where: {
        tenantId: actor.tenantId,
        status: { notIn: ['VOIDED', 'CANCELLED'] },
        createdAt: { gte: range.from, lte: range.to },
      },
      include: {
        customer: { select: { name: true } },
        cashier: { select: { name: true } },
        payments: { where: { status: { in: ['COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED'] } }, take: 1, orderBy: { createdAt: 'asc' } },
        ecommerceOrder: { select: { source: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });
    return rows.map((sale) => ({
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      customerName: sale.customer?.name ?? null,
      cashierName: sale.cashier?.name ?? null,
      source: sale.ecommerceOrder?.source ?? 'POS',
      amount: sale.total.toFixed(2),
      paymentMethod: sale.payments[0]?.method ?? null,
      status: sale.status,
      createdAt: sale.createdAt.toISOString(),
    }));
  }

  private async recentOrders(actor: AuthPrincipal, query: DashboardQueryDto): Promise<RecentOrderRow[]> {
    const { range } = await this.scope.resolve(actor, query);
    const rows = await this.prisma.order.findMany({
      where: {
        tenantId: actor.tenantId,
        source: { in: ['WEBSITE', 'WHATSAPP', 'MANUAL'] },
        createdAt: { gte: range.from, lte: range.to },
      },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });
    return rows.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customer?.name ?? null,
      source: order.source,
      amount: order.total.toFixed(2),
      paymentStatus: order.paymentStatus,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    }));
  }
}
