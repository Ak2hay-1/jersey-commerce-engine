import { Body, Controller, Get, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import { BackupsService } from './backups.service';
import { UpdateBackupSettingsDto } from './dto/update-backup-settings.dto';

@Controller('backups')
@ApiTags('backups')
@TenantScoped()
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Get('settings')
  @RequirePermissions('settings.read')
  @ApiOperation({ summary: 'Get automatic backup settings for the current tenant' })
  getSettings(@TenantId() tenantId: string) {
    return this.backupsService.getSettings(tenantId);
  }

  @Put('settings')
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Save automatic backup path, schedule time, and interval' })
  updateSettings(@TenantId() tenantId: string, @Body() dto: UpdateBackupSettingsDto) {
    return this.backupsService.updateSettings(tenantId, dto);
  }

  @Post('run')
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Run a backup immediately to the configured path' })
  runNow(@TenantId() tenantId: string) {
    return this.backupsService.runBackup(tenantId, 'MANUAL');
  }

  @Get('runs')
  @RequirePermissions('settings.read')
  @ApiOperation({ summary: 'List backup history for the current tenant' })
  findRuns(@TenantId() tenantId: string, @Query() query: PaginationQueryDto) {
    return this.backupsService.findRuns(tenantId, query);
  }
}
