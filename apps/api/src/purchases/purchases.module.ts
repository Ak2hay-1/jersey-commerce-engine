import { Module, forwardRef } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { SupplierPaymentsController } from './supplier-payments.controller';
import { SupplierPaymentsService } from './supplier-payments.service';
import { SuppliersModule } from '../suppliers/suppliers.module';

@Module({
  imports: [InventoryModule, forwardRef(() => SuppliersModule)],
  controllers: [PurchasesController, SupplierPaymentsController],
  providers: [PurchasesService, SupplierPaymentsService],
  exports: [PurchasesService, SupplierPaymentsService],
})
export class PurchasesModule {}
