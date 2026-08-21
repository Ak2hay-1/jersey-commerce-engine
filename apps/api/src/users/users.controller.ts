import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import { UsersService } from './users.service';
import { UserQueryDto } from './dto/user-query.dto';

@Controller('users')
@ApiTags('users')
@TenantScoped()
@RequirePermissions('users.read')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users for the current tenant' })
  findAll(
    @TenantId() tenantId: string,
    @Query() query: UserQueryDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.usersService.findAll(tenantId, query, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tenant user by id' })
  findById(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser() actor: AuthPrincipal) {
    return this.usersService.findById(tenantId, id, actor);
  }
}
