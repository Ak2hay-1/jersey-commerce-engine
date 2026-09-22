import { Module, forwardRef } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { StoreCoreModule } from '../store/store-core.module';
import { ShippingSettingsModule } from './shipping-settings.module';
import { ShipmentsService } from './shipments.service';
import { ShipmentsController } from './shipments.controller';
import { StoreShippingService } from './store-shipping.service';
import { StoreShippingController } from './store-shipping.controller';

@Module({
  imports: [ShippingSettingsModule, forwardRef(() => OrdersModule), StoreCoreModule],
  controllers: [ShipmentsController, StoreShippingController],
  providers: [ShipmentsService, StoreShippingService],
  exports: [ShipmentsService, StoreShippingService],
})
export class ShippingModule {}
