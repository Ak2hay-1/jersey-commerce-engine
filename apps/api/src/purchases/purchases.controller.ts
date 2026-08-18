import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import { PurchasesService } from './purchases.service';
import {
  CancelPurchaseDto,
  CreatePurchaseDto,
  ReceivePurchaseDto,
  UpdatePurchaseDto,
} from './dto/purchase-mutations.dto';
import { PurchaseQueryDto } from './dto/purchase-query.dto';

@Controller('purchases')
@ApiTags('purchases')
@TenantScoped()
export class PurchasesController {
  constructor(private readonly purchases: PurchasesService) {}

  @Get()
  @RequirePermissions('purchases.read')
  @ApiOperation({ summary: 'List purchases for the current tenant' })
  findAll(@TenantId() tenantId: string, @Query() query: PurchaseQueryDto) {
    return this.purchases.findAll(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions('purchases.read')
  @ApiOperation({ summary: 'Get purchase detail including items, receipts, and payments' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.purchases.findById(tenantId, id);
  }

  @Post()
  @RequirePermissions('purchases.create')
  @ApiOperation({ summary: 'Create a draft purchase order. Inventory is not changed.' })
  create(@TenantId() tenantId: string, @Body() dto: CreatePurchaseDto, @CurrentUser() actor: AuthPrincipal) {
    return this.purchases.create(tenantId, dto, actor);
  }

  @Patch(':id')
  @RequirePermissions('purchases.update')
  @ApiOperation({ summary: 'Update a draft purchase. Ordered purchases are preserved as history.' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.purchases.update(tenantId, id, dto, actor);
  }

  @Post(':id/order')
  @RequirePermissions('purchases.update')
  @ApiOperation({ summary: 'Move a draft purchase to ORDERED. Inventory is still unchanged.' })
  order(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser() actor: AuthPrincipal) {
    return this.purchases.order(tenantId, id, actor);
  }

  @Post(':id/receive')
  @RequirePermissions('purchases.receive')
  @ApiOperation({ summary: 'Receive goods against an ordered purchase and increase inventory' })
  receive(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ReceivePurchaseDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.purchases.receive(tenantId, id, dto, actor);
  }

  @Post(':id/cancel')
  @RequirePermissions('purchases.cancel')
  @ApiOperation({ summary: 'Cancel a draft or unordered purchase that has not been received' })
  cancel(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CancelPurchaseDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.purchases.cancel(tenantId, id, dto, actor);
  }
}
