import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import { requestMeta } from '../auth/auth-session.service';
import { OrdersService } from './orders.service';
import { StoreCheckoutService } from '../store/store-checkout.service';
import {
  AdminOrderQueryDto,
  CancelOrderDto,
  StaffCreateOrderDto,
  UpdateOrderStatusDto,
} from './dto/order.dto';

@Controller('orders')
@ApiTags('orders')
@ApiBearerAuth('access-token')
@TenantScoped()
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly checkout: StoreCheckoutService,
  ) {}

  @Get()
  @RequirePermissions('orders.read')
  @ApiOperation({ summary: 'List tenant orders with filters and pagination' })
  findAll(@TenantId() tenantId: string, @Query() query: AdminOrderQueryDto) {
    return this.orders.findAll(tenantId, query);
  }

  @Post()
  @RequirePermissions('orders.create')
  @ApiOperation({ summary: 'Create a WhatsApp or manual order using the same order engine as the storefront' })
  create(@CurrentUser() actor: AuthPrincipal, @Body() dto: StaffCreateOrderDto, @Req() request: Request) {
    return this.checkout.createStaffOrder(actor, dto, requestMeta(request));
  }

  @Get(':id')
  @RequirePermissions('orders.read')
  @ApiOperation({ summary: 'Get an order with items, customer, payment state, and tracking' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.orders.findById(tenantId, id);
  }

  @Patch(':id/status')
  @RequirePermissions('orders.update')
  @ApiOperation({ summary: 'Advance an order through the permitted status state machine' })
  updateStatus(
    @CurrentUser() actor: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() request: Request,
  ) {
    return this.orders.updateStatus(actor, id, dto, requestMeta(request));
  }

  @Post(':id/cancel')
  @RequirePermissions('orders.cancel')
  @ApiOperation({ summary: 'Cancel an order, release reserved stock, and preserve the original record' })
  cancel(
    @CurrentUser() actor: AuthPrincipal,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @Req() request: Request,
  ) {
    return this.orders.cancel(actor, id, dto, requestMeta(request));
  }
}
