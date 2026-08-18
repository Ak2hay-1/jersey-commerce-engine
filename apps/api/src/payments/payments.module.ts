import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { RefundsController } from './refunds.controller';
import { PaymentsService } from './payments.service';
import { PaymentProcessor } from './payment-processor.service';
import { PaymentProviderRegistry } from './providers/payment-provider.registry';

@Module({
  controllers: [PaymentsController, RefundsController],
  providers: [PaymentsService, PaymentProcessor, PaymentProviderRegistry],
  exports: [PaymentsService, PaymentProcessor, PaymentProviderRegistry],
})
export class PaymentsModule {}
