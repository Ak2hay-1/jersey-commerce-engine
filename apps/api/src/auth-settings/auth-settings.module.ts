import { Global, Module } from '@nestjs/common';
import { AuthSettingsController } from './auth-settings.controller';
import { AuthSettingsService } from './auth-settings.service';
import { EmailSenderService } from './email-sender.service';
import { SmsSenderService } from './sms-sender.service';

@Global()
@Module({
  controllers: [AuthSettingsController],
  providers: [AuthSettingsService, EmailSenderService, SmsSenderService],
  exports: [AuthSettingsService, EmailSenderService, SmsSenderService],
})
export class AuthSettingsModule {}
