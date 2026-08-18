import { Controller, ForbiddenException, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import { DashboardQueryDto } from '../reports/dto/report-query.dto';
import { DashboardService } from './dashboard.service';
import { SalesReportService } from '../reports/sales-report.service';
import { PaymentReportService } from '../reports/payment-report.service';
import { InventoryReportService } from '../reports/inventory-report.service';
import { CustomerReportService } from '../reports/customer-report.service';
import { can } from '../reports/rbac';

@Controller('dashboard')
@ApiTags('dashboard')
@ApiBearerAuth('access-token')
@TenantScoped()
@RequirePermissions('dashboard.read')
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly sales: SalesReportService,
    private readonly payments: PaymentReportService,
    private readonly inventory: InventoryReportService,
    private readonly customers: CustomerReportService,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Aggregated ERP dashboard KPIs, channels, payments, and snapshots' })
  summary(@CurrentUser() actor: AuthPrincipal, @Query() query: DashboardQueryDto) {
    return this.dashboard.summary(actor, query);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Revenue time series for the selected period' })
  revenue(@CurrentUser() actor: AuthPrincipal, @Query() query: DashboardQueryDto) {
    this.assertSales(actor);
    return this.sales.revenueSeries(actor, query);
  }

  @Get('sales-channels')
  @ApiOperation({ summary: 'Revenue by POS, website, WhatsApp, and manual sources' })
  channels(@CurrentUser() actor: AuthPrincipal, @Query() query: DashboardQueryDto) {
    this.assertSales(actor);
    return this.sales.salesByChannel(actor, query);
  }

  @Get('payments')
  @ApiOperation({ summary: 'Completed payment totals by method' })
  paymentsBreakdown(@CurrentUser() actor: AuthPrincipal, @Query() query: DashboardQueryDto) {
    if (!can(actor, 'payments.read') && !can(actor, 'reports.read')) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
    return this.payments.report(actor, query);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Top-selling products by quantity, revenue, or gross profit' })
  topProducts(@CurrentUser() actor: AuthPrincipal, @Query() query: DashboardQueryDto) {
    this.assertSales(actor);
    return this.sales.topProducts(actor, {
      preset: query.preset,
      from: query.from,
      to: query.to,
      take: 10,
      sort: query.sort,
    });
  }

  @Get('recent-sales')
  @ApiOperation({ summary: 'Recent POS and recognized sales' })
  async recentSales(@CurrentUser() actor: AuthPrincipal, @Query() query: DashboardQueryDto) {
    this.assertSales(actor);
    const widgets = await this.dashboard.widgets(actor, query);
    return widgets.recentSales;
  }

  @Get('recent-orders')
  @ApiOperation({ summary: 'Recent ecommerce, WhatsApp, and manual orders' })
  async recentOrders(@CurrentUser() actor: AuthPrincipal, @Query() query: DashboardQueryDto) {
    if (!can(actor, 'orders.read') && !can(actor, 'sales.read') && !can(actor, 'reports.read')) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
    const widgets = await this.dashboard.widgets(actor, query);
    return widgets.recentOrders;
  }

  @Get('inventory-alerts')
  @ApiOperation({ summary: 'Low-stock and out-of-stock variants' })
  async inventoryAlerts(@CurrentUser() actor: AuthPrincipal) {
    if (!can(actor, 'inventory.read')) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
    const [lowStock, outOfStock] = await Promise.all([
      this.inventory.alerts(actor, 'low', 12),
      this.inventory.alerts(actor, 'out', 12),
    ]);
    return { lowStock, outOfStock };
  }

  @Get('customer-summary')
  @ApiOperation({ summary: 'New, repeat, high-value, and inactive customer counts' })
  customerSummary(@CurrentUser() actor: AuthPrincipal, @Query() query: DashboardQueryDto) {
    if (!can(actor, 'customers.read')) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
    return this.customers.periodSnapshot(actor, query);
  }

  @Get('widgets')
  @ApiOperation({ summary: 'Dashboard tables: top products, recent sales/orders, and stock alerts' })
  widgets(@CurrentUser() actor: AuthPrincipal, @Query() query: DashboardQueryDto) {
    return this.dashboard.widgets(actor, query);
  }

  private assertSales(actor: AuthPrincipal): void {
    if (!can(actor, 'sales.read') && !can(actor, 'reports.read')) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
  }
}
