import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import { requestMeta } from '../auth/auth-session.service';
import { InventoryService } from './inventory.service';
import { InventoryMovementQueryDto, InventoryQueryDto } from './dto/inventory-query.dto';
import {
  AdjustInventoryDto,
  OpeningStockDto,
  ReleaseStockDto,
  ReorderLevelDto,
  ReserveStockDto,
} from './dto/inventory-mutations.dto';

@Controller('inventory')
@ApiTags('inventory')
@ApiBearerAuth('access-token')
@TenantScoped()
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  @RequirePermissions('inventory.read')
  @ApiOperation({ summary: 'List variant inventory with search, filters, sorting, and pagination' })
  findAll(@TenantId() tenantId: string, @Query() query: InventoryQueryDto) {
    return this.inventory.findAll(tenantId, query);
  }

  @Get('summary')
  @RequirePermissions('inventory.read')
  @ApiOperation({ summary: 'Inventory totals, low-stock counts, and cost-based valuation' })
  summary(@TenantId() tenantId: string) {
    return this.inventory.summary(tenantId);
  }

  @Get('barcode/:barcode')
  @RequirePermissions('inventory.read')
  @ApiOperation({ summary: 'POS lookup by barcode for the current tenant' })
  lookupByBarcode(@TenantId() tenantId: string, @Param('barcode') barcode: string) {
    return this.inventory.lookupByBarcode(tenantId, decodeURIComponent(barcode));
  }

  @Get('sku/:sku')
  @RequirePermissions('inventory.read')
  @ApiOperation({ summary: 'POS lookup by SKU for the current tenant' })
  lookupBySku(@TenantId() tenantId: string, @Param('sku') sku: string) {
    return this.inventory.lookupBySku(tenantId, decodeURIComponent(sku));
  }

  @Post('adjust')
  @RequirePermissions('inventory.adjust')
  @ApiOperation({ summary: 'Apply a signed inventory adjustment or damage write-off' })
  adjust(
    @TenantId() tenantId: string,
    @Body() dto: AdjustInventoryDto,
    @CurrentUser() actor: AuthPrincipal,
    @Req() request: Request,
  ) {
    return this.inventory.adjustStock(tenantId, dto, actor, requestMeta(request));
  }

  @Post('opening-stock')
  @RequirePermissions('inventory.adjust')
  @ApiOperation({ summary: 'Record opening stock for a variant that has no opening movement yet' })
  openingStock(
    @TenantId() tenantId: string,
    @Body() dto: OpeningStockDto,
    @CurrentUser() actor: AuthPrincipal,
    @Req() request: Request,
  ) {
    return this.inventory.setOpeningStock(tenantId, dto, actor, requestMeta(request));
  }

  @Get(':variantId/movements')
  @RequirePermissions('inventory.read')
  @ApiOperation({ summary: 'Paginated movement ledger for a variant' })
  movements(
    @TenantId() tenantId: string,
    @Param('variantId') variantId: string,
    @Query() query: InventoryMovementQueryDto,
  ) {
    return this.inventory.getMovementHistory(tenantId, variantId, query);
  }

  @Post(':variantId/reserve')
  @RequirePermissions('inventory.adjust')
  @ApiOperation({ summary: 'Reserve available stock for a later order or sale' })
  reserve(
    @TenantId() tenantId: string,
    @Param('variantId') variantId: string,
    @Body() dto: ReserveStockDto,
    @CurrentUser() actor: AuthPrincipal,
    @Req() request: Request,
  ) {
    return this.inventory.reserveStock(tenantId, variantId, dto, actor, requestMeta(request));
  }

  @Post(':variantId/release')
  @RequirePermissions('inventory.adjust')
  @ApiOperation({ summary: 'Release previously reserved stock' })
  release(
    @TenantId() tenantId: string,
    @Param('variantId') variantId: string,
    @Body() dto: ReleaseStockDto,
    @CurrentUser() actor: AuthPrincipal,
    @Req() request: Request,
  ) {
    return this.inventory.releaseStock(tenantId, variantId, dto, actor, requestMeta(request));
  }

  @Patch(':variantId')
  @RequirePermissions('inventory.manage')
  @ApiOperation({ summary: 'Update the per-variant reorder level' })
  setReorderLevel(
    @TenantId() tenantId: string,
    @Param('variantId') variantId: string,
    @Body() dto: ReorderLevelDto,
    @CurrentUser() actor: AuthPrincipal,
    @Req() request: Request,
  ) {
    return this.inventory.setReorderLevel(tenantId, variantId, dto, actor, requestMeta(request));
  }

  @Get(':variantId')
  @RequirePermissions('inventory.read')
  @ApiOperation({ summary: 'Get current inventory for a product variant' })
  findByVariantId(@TenantId() tenantId: string, @Param('variantId') variantId: string) {
    return this.inventory.findByVariantId(tenantId, variantId);
  }
}
