import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthPrincipal } from '../common/context/request-context';
import { RolesService } from './roles.service';

@Controller('roles')
@ApiTags('roles')
@TenantScoped()
@RequirePermissions('users.read')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'List roles for the current tenant' })
  findAll(
    @TenantId() tenantId: string,
    @Query() query: PaginationQueryDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.rolesService.findAll(tenantId, query, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tenant role by id' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.rolesService.findById(tenantId, id);
  }
}
