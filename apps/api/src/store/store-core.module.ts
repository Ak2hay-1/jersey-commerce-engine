import { Module } from '@nestjs/common';
import { AuthSettingsModule } from '../auth-settings/auth-settings.module';
import { StoreBootstrapService } from './store-bootstrap.service';
import { StoreTenantGuard } from './store-tenant.guard';
import { CustomerAccessGuard } from './customer-access.guard';
import { OptionalCustomerGuard } from './optional-customer.guard';

@Module({
  imports: [AuthSettingsModule],
  providers: [StoreBootstrapService, StoreTenantGuard, CustomerAccessGuard, OptionalCustomerGuard],
  exports: [StoreBootstrapService, StoreTenantGuard, CustomerAccessGuard, OptionalCustomerGuard],
})
export class StoreCoreModule {}
