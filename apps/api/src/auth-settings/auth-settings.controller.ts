import { Body, Controller, Get, Post, Put, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import { requestMeta } from '../auth/auth-session.service';
import { AuthSettingsService } from './auth-settings.service';
import { TestEmailDto, TestSmsDto, UpdateAuthSettingsDto } from './dto/update-auth-settings.dto';

@Controller('auth-settings')
@ApiTags('auth-settings')
@TenantScoped()
export class AuthSettingsController {
  constructor(private readonly settings: AuthSettingsService) {}

  @Get()
  @RequirePermissions('settings.read')
  @ApiOperation({ summary: 'Get storefront authentication methods and masked provider credentials' })
  get(@TenantId() tenantId: string) {
    return this.settings.getSettings(tenantId);
  }

  @Put()
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Enable or disable customer login methods and save provider API keys' })
  update(
    @TenantId() tenantId: string,
    @CurrentUser() actor: AuthPrincipal,
    @Body() dto: UpdateAuthSettingsDto,
    @Req() request: Request,
  ) {
    return this.settings.updateSettings(tenantId, dto, actor, requestMeta(request));
  }

  @Post('test-email')
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Send a test email using the saved email provider' })
  testEmail(@TenantId() tenantId: string, @CurrentUser() actor: AuthPrincipal, @Body() dto: TestEmailDto) {
    return this.settings.sendTestEmail(tenantId, dto, actor);
  }

  @Post('test-sms')
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Send a test SMS using the saved SMS provider' })
  testSms(@TenantId() tenantId: string, @CurrentUser() actor: AuthPrincipal, @Body() dto: TestSmsDto) {
    return this.settings.sendTestSms(tenantId, dto, actor);
  }
}
