import { BadRequestException, Body, Controller, Get, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import { NotificationSettingsService } from './notification-settings.service';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';

@Controller('notification-settings')
@ApiTags('notification-settings')
@TenantScoped()
export class NotificationSettingsController {
  constructor(private readonly settings: NotificationSettingsService) {}

  @Get()
  @RequirePermissions('settings.read')
  @ApiOperation({ summary: 'Get Telegram notification settings' })
  get(@TenantId() tenantId: string) {
    return this.settings.getSettings(tenantId);
  }

  @Put()
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Configure Telegram staff alerts' })
  update(@TenantId() tenantId: string, @CurrentUser() actor: AuthPrincipal, @Body() dto: UpdateNotificationSettingsDto) {
    return this.settings.updateSettings(tenantId, dto, actor);
  }

  @Post('telegram/test')
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Send a test Telegram message' })
  async test(@TenantId() tenantId: string) {
    try {
      return await this.settings.sendTestMessage(tenantId);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Could not send Telegram test message.');
    }
  }
}
