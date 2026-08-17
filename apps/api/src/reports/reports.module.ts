import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportingCacheService } from './reporting-cache.service';
import { ReportingScopeService } from './reporting-scope.service';
import { SalesReportService } from './sales-report.service';
import { InventoryReportService } from './inventory-report.service';
import { PurchaseReportService } from './purchase-report.service';
import { CustomerReportService } from './customer-report.service';
import { PaymentReportService } from './payment-report.service';
import { ExpenseReportService } from './expense-report.service';
import { CustomOrderReportService } from './custom-order-report.service';

@Module({
  imports: [CustomersModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportingCacheService,
    ReportingScopeService,
    SalesReportService,
    InventoryReportService,
    PurchaseReportService,
    CustomerReportService,
    PaymentReportService,
    ExpenseReportService,
    CustomOrderReportService,
  ],
  exports: [
    ReportsService,
    ReportingCacheService,
    ReportingScopeService,
    SalesReportService,
    InventoryReportService,
    PurchaseReportService,
    CustomerReportService,
    PaymentReportService,
    ExpenseReportService,
    CustomOrderReportService,
  ],
})
export class ReportsModule {}
