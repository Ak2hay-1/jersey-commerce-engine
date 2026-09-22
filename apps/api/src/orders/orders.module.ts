import { Module, forwardRef } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { CustomersModule } from '../customers/customers.module';
import { PaymentsModule } from '../payments/payments.module';
import { ShippingModule } from '../shipping/shipping.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderEngineService } from './order-engine.service';
import { OrderSaleRecognitionService } from './order-sale.service';
import { ShippingCalculator } from './shipping.calculator';
import { UnconfiguredOnlineGateway } from './unconfigured-online.gateway';
import { RazorpayOnlineGateway } from './razorpay-online.gateway';
import { StoreCartController } from '../store/store-cart.controller';
import { StoreCartService } from '../store/store-cart.service';
import { StoreCheckoutController } from '../store/store-checkout.controller';
import { StoreCheckoutService } from '../store/store-checkout.service';
import { StoreRazorpayController } from '../store/store-razorpay.controller';
import { StoreOrdersController } from '../store/store-orders.controller';
import { StoreCoreModule } from '../store/store-core.module';
import { PromoCodesModule } from '../promo-codes/promo-codes.module';

@Module({
  imports: [
    InventoryModule,
    CustomersModule,
    PaymentsModule,
    StoreCoreModule,
    PromoCodesModule,
    forwardRef(() => ShippingModule),
  ],
  controllers: [
    OrdersController,
    StoreCartController,
    StoreCheckoutController,
    StoreRazorpayController,
    StoreOrdersController,
  ],
  providers: [
    OrdersService,
    OrderEngineService,
    OrderSaleRecognitionService,
    ShippingCalculator,
    UnconfiguredOnlineGateway,
    RazorpayOnlineGateway,
    StoreCartService,
    StoreCheckoutService,
  ],
  exports: [
    OrdersService,
    OrderEngineService,
    StoreCartService,
    StoreCheckoutService,
    ShippingCalculator,
    RazorpayOnlineGateway,
  ],
})
export class OrdersModule {}
