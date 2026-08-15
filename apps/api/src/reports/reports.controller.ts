import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import { PurchaseReportQueryDto, ReportQueryDto } from './dto/report-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@ApiTags('reports')
@TenantScoped()
@RequirePermissions('reports.read')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('sales-summary')
  @ApiOperation({ summary: 'Sales totals from persisted transactions for the current tenant' })
  salesSummary(@CurrentUser() actor: AuthPrincipal, @Query() query: ReportQueryDto) {
    return this.reports.salesSummary(actor, query);
  }

  @Get('payment-summary')
  @ApiOperation({ summary: 'Payment method totals from completed transactions' })
  paymentSummary(@CurrentUser() actor: AuthPrincipal, @Query() query: ReportQueryDto) {
    return this.reports.paymentSummary(actor, query);
  }

  @Get('session-summary')
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
}
