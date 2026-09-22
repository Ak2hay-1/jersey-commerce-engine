import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import { ShippingSettingsService } from './shipping-settings.service';
import { UpdateShippingSettingsDto } from './dto/shipping.dto';

@Controller('shipping-settings')
@ApiTags('shipping-settings')
@ApiBearerAuth('access-token')
@TenantScoped()
export class ShippingSettingsController {
  constructor(private readonly settings: ShippingSettingsService) {}

  @Get()
  @RequirePermissions('settings.read')
  @ApiOperation({ summary: 'Get Delhivery / shipping settings for the tenant' })
  get(@TenantId() tenantId: string) {
    return this.settings.getSettings(tenantId);
  }

  @Put()
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Update Delhivery / shipping settings' })
  update(
    @TenantId() tenantId: string,
    @CurrentUser() actor: AuthPrincipal,
    @Body() dto: UpdateShippingSettingsDto,
  ) {
    return this.settings.updateSettings(tenantId, dto, actor);
  }
}
