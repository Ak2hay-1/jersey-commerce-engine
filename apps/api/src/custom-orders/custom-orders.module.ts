import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { CustomersModule } from '../customers/customers.module';
import { PaymentsModule } from '../payments/payments.module';
import { StoreCoreModule } from '../store/store-core.module';
import { CustomOrdersController } from './custom-orders.controller';
import { CustomizationOptionsController } from './customization-options.controller';
import { StoreCustomOrdersController } from './store-custom-orders.controller';
import { CustomOrdersService } from './custom-orders.service';

@Module({
  imports: [InventoryModule, CustomersModule, PaymentsModule, StoreCoreModule],
  controllers: [CustomOrdersController, CustomizationOptionsController, StoreCustomOrdersController],
  providers: [CustomOrdersService],
  exports: [CustomOrdersService],
})
export class CustomOrdersModule {}
