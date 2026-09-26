import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';

@Controller('warehouses')
@ApiTags('warehouses')
@TenantScoped()
export class WarehousesController {
  constructor(private readonly warehouses: WarehousesService) {}

  @Get()
  @RequirePermissions('inventory.read')
  @ApiOperation({ summary: 'List warehouses / Delhivery pickup origins' })
  list(@TenantId() tenantId: string) {
    return this.warehouses.list(tenantId);
  }

  @Get(':id')
  @RequirePermissions('inventory.read')
  @ApiOperation({ summary: 'Get a warehouse by id' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.warehouses.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('inventory.manage')
  @ApiOperation({ summary: 'Create a warehouse' })
  create(@TenantId() tenantId: string, @Body() dto: CreateWarehouseDto, @CurrentUser() actor: AuthPrincipal) {
    return this.warehouses.create(tenantId, dto, actor);
  }

  @Patch(':id')
  @RequirePermissions('inventory.manage')
  @ApiOperation({ summary: 'Update a warehouse' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.warehouses.update(tenantId, id, dto, actor);
  }

  @Delete(':id')
  @RequirePermissions('inventory.manage')
  @ApiOperation({ summary: 'Deactivate a warehouse' })
  remove(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser() actor: AuthPrincipal) {
    return this.warehouses.remove(tenantId, id, actor);
  }
}
