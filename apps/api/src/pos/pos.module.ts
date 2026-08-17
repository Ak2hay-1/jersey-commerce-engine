import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CustomersModule } from '../customers/customers.module';
import { PaymentsModule } from '../payments/payments.module';
import { ReceiptsModule } from '../receipts/receipts.module';
import { InvoiceService } from './invoice.service';
import { PosCartController, PosHeldCartController } from './pos-cart.controller';
import { PosCartService } from './pos-cart.service';
import { PosLookupController } from './pos-lookup.controller';
import { PosLookupService } from './pos-lookup.service';
import { PosCustomerController } from './pos-customer.controller';
import { PosRefundService } from './pos-refund.service';
import { PosSaleController } from './pos-sale.controller';
import { PosSaleService } from './pos-sale.service';
import { PosSessionController } from './pos-session.controller';
import { PosSessionService } from './pos-session.service';

@Module({
  imports: [ProductsModule, InventoryModule, CustomersModule, PaymentsModule, ReceiptsModule],
  controllers: [
    PosSessionController,
    PosCartController,
    PosHeldCartController,
    PosLookupController,
    PosCustomerController,
    PosSaleController,
  ],
  providers: [
    PosSessionService,
    PosCartService,
    PosLookupService,
    PosSaleService,
    PosRefundService,
    InvoiceService,
  ],
})
export class PosModule {}
