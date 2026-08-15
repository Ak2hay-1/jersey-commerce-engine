import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { SkuGenerator } from '../catalog/sku-generator';
import { StorageModule } from '../storage/storage.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [StorageModule, InventoryModule],
  controllers: [ProductsController],
  providers: [ProductsService, SkuGenerator],
  exports: [ProductsService],
})
export class ProductsModule {}
