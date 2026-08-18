import { Module } from '@nestjs/common';
import { StoreBootstrapService } from './store-bootstrap.service';
import { StoreTenantGuard } from './store-tenant.guard';
import { CustomerAccessGuard } from './customer-access.guard';
import { OptionalCustomerGuard } from './optional-customer.guard';

@Module({
  providers: [StoreBootstrapService, StoreTenantGuard, CustomerAccessGuard, OptionalCustomerGuard],
  exports: [StoreBootstrapService, StoreTenantGuard, CustomerAccessGuard, OptionalCustomerGuard],
})
export class StoreCoreModule {}
