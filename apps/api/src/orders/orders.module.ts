import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { CustomersModule } from '../customers/customers.module';
import { PaymentsModule } from '../payments/payments.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderEngineService } from './order-engine.service';
import { OrderSaleRecognitionService } from './order-sale.service';
import { ShippingCalculator } from './shipping.calculator';
import { UnconfiguredOnlineGateway } from './unconfigured-online.gateway';
import { StoreCartController } from '../store/store-cart.controller';
import { StoreCartService } from '../store/store-cart.service';
import { StoreCheckoutController } from '../store/store-checkout.controller';
import { StoreCheckoutService } from '../store/store-checkout.service';
import { StoreOrdersController } from '../store/store-orders.controller';
import { StoreCoreModule } from '../store/store-core.module';

@Module({
  imports: [InventoryModule, CustomersModule, PaymentsModule, StoreCoreModule],
  controllers: [OrdersController, StoreCartController, StoreCheckoutController, StoreOrdersController],
  providers: [
    OrdersService,
    OrderEngineService,
    OrderSaleRecognitionService,
    ShippingCalculator,
    UnconfiguredOnlineGateway,
    StoreCartService,
    StoreCheckoutService,
  ],
  exports: [OrdersService, OrderEngineService, StoreCartService, StoreCheckoutService, ShippingCalculator],
})
export class OrdersModule {}
