import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditQueryDto } from './dto/audit-query.dto';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import { AuditService } from './audit.service';

@Controller('audit')
@ApiTags('audit')
@TenantScoped()
@RequirePermissions('reports.read')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs for the current tenant' })
  findAll(@TenantId() tenantId: string, @Query() query: AuditQueryDto) {
    return this.service.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an audit log by id' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findById(tenantId, id);
  }
}
