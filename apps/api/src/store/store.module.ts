import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { AuthSettingsModule } from '../auth-settings/auth-settings.module';
import { StoreCoreModule } from './store-core.module';
import { StoreCatalogService } from './store-catalog.service';
import { StoreAuthService } from './store-auth.service';
import { StoreOtpService } from './store-otp.service';
import { StoreGoogleAuthService } from './store-google-auth.service';
import { StorePrivacyService } from './store-privacy.service';
import { StorePasswordResetService } from './store-password-reset.service';
import { StoreBootstrapController } from './store-bootstrap.controller';
import { StoreCatalogController } from './store-catalog.controller';
import { StoreAuthController } from './store-auth.controller';
import { StoreGoogleCallbackController } from './store-google-callback.controller';
import { StoreContactController } from './store-contact.controller';
import { StoreContactService } from './store-contact.service';

@Module({
  imports: [StoreCoreModule, OrdersModule, AuthSettingsModule],
  controllers: [
    StoreBootstrapController,
    StoreCatalogController,
    StoreAuthController,
    StoreGoogleCallbackController,
    StoreContactController,
  ],
  providers: [
    StoreCatalogService,
    StoreAuthService,
    StoreOtpService,
    StoreGoogleAuthService,
    StorePrivacyService,
    StorePasswordResetService,
    StoreContactService,
  ],
})
export class StoreModule {}
