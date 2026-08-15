import { Controller, ForbiddenException, Get, Query, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import { AuditService } from '../audit/audit.service';
import {
  CustomOrderReportQueryDto,
  CustomerAnalyticsQueryDto,
  ExpenseReportQueryDto,
  InventoryReportQueryDto,
  PaymentReportQueryDto,
  PurchaseReportQueryDto,
  ReportQueryDto,
  SalesReportQueryDto,
} from './dto/report-query.dto';
import { ReportsService } from './reports.service';
import { SalesReportService } from './sales-report.service';
import { InventoryReportService } from './inventory-report.service';
import { PurchaseReportService } from './purchase-report.service';
import { CustomerReportService } from './customer-report.service';
import { PaymentReportService } from './payment-report.service';
import { ExpenseReportService } from './expense-report.service';
import { CustomOrderReportService } from './custom-order-report.service';
import { auditExport, csvFile, toCsv } from './export-csv';
import { can } from './rbac';

@Controller('reports')
@ApiTags('reports')
@ApiBearerAuth('access-token')
@TenantScoped()
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly sales: SalesReportService,
    private readonly inventory: InventoryReportService,
    private readonly purchases: PurchaseReportService,
    private readonly customers: CustomerReportService,
    private readonly payments: PaymentReportService,
    private readonly expenses: ExpenseReportService,
    private readonly customOrders: CustomOrderReportService,
    private readonly audit: AuditService,
  ) {}

  @Get('sales-summary')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Sales totals from persisted transactions for the current tenant' })
  salesSummary(@CurrentUser() actor: AuthPrincipal, @Query() query: ReportQueryDto) {
    return this.reports.salesSummary(actor, query);
  }

  @Get('payment-summary')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Payment method totals from completed transactions' })
  paymentSummary(@CurrentUser() actor: AuthPrincipal, @Query() query: ReportQueryDto) {
    return this.reports.paymentSummary(actor, query);
  }

  @Get('session-summary')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'POS session cash reconciliation from payment and refund ledgers' })
  sessionSummary(@CurrentUser() actor: AuthPrincipal, @Query() query: ReportQueryDto) {
    return this.reports.sessionSummary(actor, query);
  }

  @Get('purchases-summary')
  @RequirePermissions('purchases.read')
  @ApiOperation({ summary: 'Purchase totals, quantities, and costs for the current tenant' })
  purchasesSummary(@CurrentUser() actor: AuthPrincipal, @Query() query: PurchaseReportQueryDto) {
    return this.reports.purchasesSummary(actor, query);
  }

  @Get('supplier-balances')
  @RequirePermissions('purchases.read')
  @ApiOperation({ summary: 'Outstanding supplier payables for the current tenant' })
  supplierBalances(@CurrentUser() actor: AuthPrincipal, @Query() query: PurchaseReportQueryDto) {
    return this.reports.supplierBalances(actor, query);
  }

  @Get('top-suppliers')
  @RequirePermissions('purchases.read')
  @ApiOperation({ summary: 'Top suppliers by purchase total, outstanding balance, or quantity' })
  topSuppliers(@CurrentUser() actor: AuthPrincipal, @Query() query: PurchaseReportQueryDto) {
    return this.reports.topSuppliers(actor, query);
  }

  @Get('sales')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Paginated sales report with revenue, COGS, gross profit, and margin' })
  salesReport(@CurrentUser() actor: AuthPrincipal, @Query() query: SalesReportQueryDto) {
    return this.sales.salesReport(actor, query);
  }

  @Get('sales/export')
  @RequirePermissions('reports.export')
  @ApiOperation({ summary: 'CSV export of the sales report using the same filters' })
  async salesExport(
    @CurrentUser() actor: AuthPrincipal,
    @Query() query: SalesReportQueryDto,
  ): Promise<StreamableFile> {
    const result = await this.sales.salesReport(actor, { ...query, page: 1, pageSize: 100 });
    await auditExport(this.audit, actor, 'sales', { ...query }, result.items.length);
    return csvFile(
      'sales-report.csv',
      toCsv(
        [
          { key: 'invoice', header: 'Invoice', value: (row) => row.invoiceNumber },
          { key: 'date', header: 'Date', value: (row) => row.createdAt },
          { key: 'source', header: 'Source', value: (row) => row.source },
          { key: 'customer', header: 'Customer', value: (row) => row.customerName },
          { key: 'revenue', header: 'Revenue', value: (row) => row.revenue },
          { key: 'cogs', header: 'COGS', value: (row) => row.cogs },
          { key: 'profit', header: 'Gross profit', value: (row) => row.grossProfit },
          { key: 'margin', header: 'Margin %', value: (row) => row.marginPercent },
        ],
        result.items,
      ),
    );
  }

  @Get('inventory')
  @RequirePermissions('inventory.read')
  @ApiOperation({ summary: 'Current inventory valuation and stock status' })
  inventoryReport(@CurrentUser() actor: AuthPrincipal, @Query() query: InventoryReportQueryDto) {
    return this.inventory.report(actor, query);
  }

  @Get('inventory/export')
  @RequirePermissions('reports.export')
  @ApiOperation({ summary: 'CSV export of the inventory report' })
  async inventoryExport(
    @CurrentUser() actor: AuthPrincipal,
    @Query() query: InventoryReportQueryDto,
  ): Promise<StreamableFile> {
    if (!can(actor, 'inventory.read')) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
    const result = await this.inventory.report(actor, { ...query, page: 1, pageSize: 100 });
    await auditExport(this.audit, actor, 'inventory', { ...query }, result.items.length);
    return csvFile(
      'inventory-report.csv',
      toCsv(
        [
          { key: 'product', header: 'Product', value: (row) => row.productName },
          { key: 'variant', header: 'Variant', value: (row) => row.variantLabel },
          { key: 'sku', header: 'SKU', value: (row) => row.sku },
          { key: 'qty', header: 'Stock', value: (row) => row.quantity },
          { key: 'reserved', header: 'Reserved', value: (row) => row.reservedQuantity },
          { key: 'available', header: 'Available', value: (row) => row.availableQuantity },
          { key: 'cost', header: 'Cost value', value: (row) => row.costValue },
          { key: 'sell', header: 'Selling value', value: (row) => row.sellingValue },
          { key: 'status', header: 'Status', value: (row) => row.stockStatus },
        ],
        result.items,
      ),
    );
  }

  @Get('purchases')
  @RequirePermissions('purchases.read')
  @ApiOperation({ summary: 'Purchase report with supplier totals and outstanding amounts' })
  purchaseReport(@CurrentUser() actor: AuthPrincipal, @Query() query: PurchaseReportQueryDto) {
    return this.purchases.report(actor, query);
  }

  @Get('purchases/export')
  @RequirePermissions('reports.export')
  async purchaseExport(
    @CurrentUser() actor: AuthPrincipal,
    @Query() query: PurchaseReportQueryDto,
  ): Promise<StreamableFile> {
    if (!can(actor, 'purchases.read')) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
    const result = await this.purchases.report(actor, { ...query, page: 1, pageSize: 100 });
    await auditExport(this.audit, actor, 'purchases', { ...query }, result.items.length);
    return csvFile(
      'purchases-report.csv',
      toCsv(
        [
          { key: 'number', header: 'Purchase', value: (row) => row.purchaseNumber },
          { key: 'supplier', header: 'Supplier', value: (row) => row.supplierName },
          { key: 'total', header: 'Total', value: (row) => row.total },
          { key: 'outstanding', header: 'Outstanding', value: (row) => row.outstanding },
        ],
        result.items,
      ),
    );
  }

  @Get('customers')
  @RequirePermissions('customers.read')
  @ApiOperation({ summary: 'Customer analytics: new, repeat, high-value, inactive, and top spenders' })
  customerReport(@CurrentUser() actor: AuthPrincipal, @Query() query: CustomerAnalyticsQueryDto) {
    return this.customers.report(actor, query);
  }

  @Get('customers/export')
  @RequirePermissions('reports.export')
  async customerExport(
    @CurrentUser() actor: AuthPrincipal,
    @Query() query: CustomerAnalyticsQueryDto,
  ): Promise<StreamableFile> {
    if (!can(actor, 'customers.read')) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
    const result = await this.customers.report(actor, { ...query, page: 1, pageSize: 100 });
    await auditExport(this.audit, actor, 'customers', { ...query }, result.items.length);
    return csvFile(
      'customers-report.csv',
      toCsv(
        [
          { key: 'name', header: 'Customer', value: (row) => row.name },
          { key: 'orders', header: 'Orders', value: (row) => row.orderCount },
          { key: 'spent', header: 'Total spent', value: (row) => row.totalSpent },
          { key: 'aov', header: 'AOV', value: (row) => row.averageOrderValue },
        ],
        result.items,
      ),
    );
  }

  @Get('payments')
  @RequirePermissions('payments.read')
  @ApiOperation({ summary: 'Payment method totals and refunds for the selected period' })
  paymentReport(@CurrentUser() actor: AuthPrincipal, @Query() query: PaymentReportQueryDto) {
    return this.payments.report(actor, query);
  }

  @Get('payments/export')
  @RequirePermissions('reports.export')
  async paymentExport(@CurrentUser() actor: AuthPrincipal, @Query() query: PaymentReportQueryDto): Promise<StreamableFile> {
    if (!can(actor, 'payments.read')) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
    const result = await this.payments.report(actor, query);
    await auditExport(this.audit, actor, 'payments', { ...query }, result.methods.length);
    return csvFile(
      'payments-report.csv',
      toCsv(
        [
          { key: 'method', header: 'Method', value: (row) => row.method },
          { key: 'payments', header: 'Payments', value: (row) => row.payments },
          { key: 'refunds', header: 'Refunds', value: (row) => row.refunds },
          { key: 'net', header: 'Net', value: (row) => row.net },
        ],
        result.methods,
      ),
    );
  }

  @Get('expenses')
  @RequirePermissions('expenses.read')
  @ApiOperation({ summary: 'Expense totals by category and trend' })
  expenseReport(@CurrentUser() actor: AuthPrincipal, @Query() query: ExpenseReportQueryDto) {
    return this.expenses.report(actor, query);
  }

  @Get('expenses/export')
  @RequirePermissions('reports.export')
  async expenseExport(
    @CurrentUser() actor: AuthPrincipal,
    @Query() query: ExpenseReportQueryDto,
  ): Promise<StreamableFile> {
    if (!can(actor, 'expenses.read')) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
    const result = await this.expenses.report(actor, { ...query, page: 1, pageSize: 100 });
    await auditExport(this.audit, actor, 'expenses', { ...query }, result.items.length);
    return csvFile(
      'expenses-report.csv',
      toCsv(
        [
          { key: 'date', header: 'Date', value: (row) => row.expenseDate },
          { key: 'category', header: 'Category', value: (row) => row.category },
          { key: 'amount', header: 'Amount', value: (row) => row.amount },
          { key: 'status', header: 'Status', value: (row) => row.status },
        ],
        result.items,
      ),
    );
  }

  @Get('custom-orders')
  @RequirePermissions('customOrders.read')
  @ApiOperation({ summary: 'Custom order funnel counts and quoted vs confirmed value' })
  customOrderReport(@CurrentUser() actor: AuthPrincipal, @Query() query: CustomOrderReportQueryDto) {
    return this.customOrders.report(actor, query);
  }

  @Get('custom-orders/export')
  @RequirePermissions('reports.export')
  async customOrderExport(
    @CurrentUser() actor: AuthPrincipal,
    @Query() query: CustomOrderReportQueryDto,
  ): Promise<StreamableFile> {
    if (!can(actor, 'customOrders.read')) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
    const result = await this.customOrders.report(actor, query);
    const rows = Object.entries(result.counts).map(([status, count]) => ({ status, count }));
    await auditExport(this.audit, actor, 'custom-orders', { ...query }, rows.length);
    return csvFile(
      'custom-orders-report.csv',
      toCsv(
        [
          { key: 'status', header: 'Status', value: (row) => row.status },
          { key: 'count', header: 'Count', value: (row) => row.count },
        ],
        rows,
      ),
    );
  }
}
