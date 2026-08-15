import { Module, forwardRef } from '@nestjs/common';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { PurchasesModule } from '../purchases/purchases.module';

@Module({
  imports: [forwardRef(() => PurchasesModule)],
  controllers: [SuppliersController],
  providers: [SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
