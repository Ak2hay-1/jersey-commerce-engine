import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import { UsersService } from './users.service';

@Controller('users')
@ApiTags('users')
@TenantScoped()
@RequirePermissions('users.read')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users for the current tenant' })
  findAll(@TenantId() tenantId: string, @Query() query: PaginationQueryDto) {
    return this.usersService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tenant user by id' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.usersService.findById(tenantId, id);
  }
}
