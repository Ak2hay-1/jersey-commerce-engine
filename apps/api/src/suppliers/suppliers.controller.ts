import { Inject, forwardRef } from '@nestjs/common';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import { SuppliersService } from './suppliers.service';
import { PurchasesService } from '../purchases/purchases.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier-mutations.dto';
import { SupplierQueryDto } from './dto/supplier-query.dto';
import { PurchaseQueryDto } from '../purchases/dto/purchase-query.dto';

@Controller('suppliers')
@ApiTags('suppliers')
@TenantScoped()
export class SuppliersController {
  constructor(
    private readonly service: SuppliersService,
    @Inject(forwardRef(() => PurchasesService)) private readonly purchases: PurchasesService,
  ) {}

  @Get()
  @RequirePermissions('suppliers.read')
  @ApiOperation({ summary: 'Search suppliers by name, contact person, phone, or email' })
  findAll(@TenantId() tenantId: string, @Query() query: SupplierQueryDto) {
    return this.service.findAll(tenantId, query);
  }

  @Get(':id/balance')
  @RequirePermissions('suppliers.read')
  @ApiOperation({ summary: 'Supplier payable totals: purchases, paid, and outstanding' })
  balance(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.balance(tenantId, id);
  }

  @Get(':id/purchases')
  @RequirePermissions('purchases.read')
  @ApiOperation({ summary: 'Purchase history for a supplier' })
  purchasesForSupplier(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query() query: PurchaseQueryDto,
  ) {
    return this.purchases.findAll(tenantId, { ...query, supplierId: id });
  }

  @Get(':id')
  @RequirePermissions('suppliers.read')
  @ApiOperation({ summary: 'Get a supplier by id' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('suppliers.create')
  @ApiOperation({ summary: 'Create a tenant-scoped supplier' })
  create(@TenantId() tenantId: string, @Body() dto: CreateSupplierDto, @CurrentUser() actor: AuthPrincipal) {
    return this.service.create(tenantId, dto, actor);
  }

  @Patch(':id')
  @RequirePermissions('suppliers.update')
  @ApiOperation({ summary: 'Update supplier profile or status' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.service.update(tenantId, id, dto, actor);
  }

  @Delete(':id')
  @RequirePermissions('suppliers.delete')
  @ApiOperation({
    summary: 'Delete a supplier with no purchases, or deactivate a supplier who has purchase history',
  })
  remove(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser() actor: AuthPrincipal) {
    return this.service.remove(tenantId, id, actor);
  }
}
