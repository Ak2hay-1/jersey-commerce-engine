import { Body, Controller, Delete, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { RoleCode } from '../prisma/client';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthPrincipal } from '../common/context/request-context';
import { requestMeta } from '../auth/auth-session.service';
import { UsersAdminService } from './users-admin.service';
import { AssignRoleDto, CreateUserDto, UpdateUserDto } from './dto/user-mutations.dto';
import { SetTemporaryPasswordDto } from './dto/set-temporary-password.dto';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersAdminController {
  constructor(private readonly users: UsersAdminService) {}

  @Post()
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Create a user in the current tenant' })
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthPrincipal, @Req() request: Request) {
    return this.users.create(dto, actor, requestMeta(request));
  }

  @Patch(':id')
  @RequirePermissions('users.manage')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthPrincipal,
    @Req() request: Request,
  ) {
    return this.users.update(id, dto, actor, requestMeta(request));
  }

  @Post(':id/activate')
  @RequirePermissions('users.manage')
  activate(@Param('id') id: string, @CurrentUser() actor: AuthPrincipal, @Req() request: Request) {
    return this.users.setActive(id, true, actor, requestMeta(request));
  }

  @Post(':id/deactivate')
  @RequirePermissions('users.manage')
  deactivate(@Param('id') id: string, @CurrentUser() actor: AuthPrincipal, @Req() request: Request) {
    return this.users.setActive(id, false, actor, requestMeta(request));
  }

  @Post(':id/temporary-password')
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Set a temporary password that must be changed on next sign-in' })
  setTemporaryPassword(
    @Param('id') id: string,
    @Body() dto: SetTemporaryPasswordDto,
    @CurrentUser() actor: AuthPrincipal,
    @Req() request: Request,
  ) {
    return this.users.setTemporaryPassword(id, dto, actor, requestMeta(request));
  }

  @Delete(':id')
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Soft-delete a user by deactivating the account' })
  remove(@Param('id') id: string, @CurrentUser() actor: AuthPrincipal, @Req() request: Request) {
    return this.users.setActive(id, false, actor, requestMeta(request));
  }

  @Post(':id/roles')
  @RequirePermissions('users.manage')
  assignRole(
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() actor: AuthPrincipal,
    @Req() request: Request,
  ) {
    return this.users.assignRole(id, dto, actor, requestMeta(request));
  }

  @Delete(':id/roles/:roleCode')
  @RequirePermissions('users.manage')
  removeRole(
    @Param('id') id: string,
    @Param('roleCode') roleCode: RoleCode,
    @CurrentUser() actor: AuthPrincipal,
    @Req() request: Request,
  ) {
    return this.users.removeRole(id, roleCode, actor, requestMeta(request));
  }
}
