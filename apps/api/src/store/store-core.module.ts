import { Module } from '@nestjs/common';
import { AuthSettingsModule } from '../auth-settings/auth-settings.module';
import { PaymentSettingsModule } from '../payment-settings/payment-settings.module';
import { ShippingSettingsModule } from '../shipping/shipping-settings.module';
import { StoreBootstrapService } from './store-bootstrap.service';
import { StoreTenantGuard } from './store-tenant.guard';
import { CustomerAccessGuard } from './customer-access.guard';
import { OptionalCustomerGuard } from './optional-customer.guard';

@Module({
  imports: [AuthSettingsModule, PaymentSettingsModule, ShippingSettingsModule],
  providers: [StoreBootstrapService, StoreTenantGuard, CustomerAccessGuard, OptionalCustomerGuard],
  exports: [StoreBootstrapService, StoreTenantGuard, CustomerAccessGuard, OptionalCustomerGuard],
})
export class StoreCoreModule {}
