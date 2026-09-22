import { Global, Module } from '@nestjs/common';
import { DelhiveryClient } from './delhivery.client';
import { ShippingSettingsService } from './shipping-settings.service';
import { ShippingSettingsController } from './shipping-settings.controller';

@Global()
@Module({
  controllers: [ShippingSettingsController],
  providers: [DelhiveryClient, ShippingSettingsService],
  exports: [DelhiveryClient, ShippingSettingsService],
})
export class ShippingSettingsModule {}
