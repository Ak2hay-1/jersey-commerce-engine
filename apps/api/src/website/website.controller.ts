import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import { WebsiteService } from './website.service';

@Controller('website')
@ApiTags('website')
@TenantScoped()
@RequirePermissions('website.read')
export class WebsiteController {
  constructor(private readonly websiteService: WebsiteService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Get website settings for the current tenant' })
  getSettings(@TenantId() tenantId: string) {
    return this.websiteService.getSettings(tenantId);
  }
}
