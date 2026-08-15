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
import { StoreTenantGuard } from '../store/store-tenant.guard';
import { CustomerAccessGuard } from '../store/customer-access.guard';

@Module({
  imports: [InventoryModule, CustomersModule, PaymentsModule],
  controllers: [OrdersController, StoreCartController, StoreCheckoutController, StoreOrdersController],
  providers: [
    OrdersService,
    OrderEngineService,
    OrderSaleRecognitionService,
    ShippingCalculator,
    UnconfiguredOnlineGateway,
    StoreCartService,
    StoreCheckoutService,
    StoreTenantGuard,
    CustomerAccessGuard,
  ],
  exports: [OrdersService, OrderEngineService, StoreCartService, StoreCheckoutService],
})
export class OrdersModule {}
