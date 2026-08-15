import { Module } from '@nestjs/common';
import { CustomerInsightsService } from './customer-insights.service';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService, CustomerInsightsService],
  exports: [CustomersService, CustomerInsightsService],
})
export class CustomersModule {}
