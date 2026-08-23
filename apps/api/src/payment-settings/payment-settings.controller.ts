import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import { PaymentSettingsService } from './payment-settings.service';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';

@Controller('payment-settings')
@ApiTags('payment-settings')
@TenantScoped()
export class PaymentSettingsController {
  constructor(private readonly settings: PaymentSettingsService) {}

  @Get()
  @RequirePermissions('settings.read')
  @ApiOperation({ summary: 'Get storefront payment gateway settings' })
  get(@TenantId() tenantId: string) {
    return this.settings.getSettings(tenantId);
  }

  @Put()
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Configure Razorpay for storefront checkout' })
  update(@TenantId() tenantId: string, @CurrentUser() actor: AuthPrincipal, @Body() dto: UpdatePaymentSettingsDto) {
    return this.settings.updateSettings(tenantId, dto, actor);
  }
}
