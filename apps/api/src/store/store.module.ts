import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { StoreCoreModule } from './store-core.module';
import { StoreCatalogService } from './store-catalog.service';
import { StoreAuthService } from './store-auth.service';
import { StoreBootstrapController } from './store-bootstrap.controller';
import { StoreCatalogController } from './store-catalog.controller';
import { StoreAuthController } from './store-auth.controller';

@Module({
  imports: [StoreCoreModule, OrdersModule],
  controllers: [StoreBootstrapController, StoreCatalogController, StoreAuthController],
  providers: [StoreCatalogService, StoreAuthService],
})
export class StoreModule {}
