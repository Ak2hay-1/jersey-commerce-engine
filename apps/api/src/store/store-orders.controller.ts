import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { requestMeta } from '../auth/auth-session.service';
import { OrdersService } from '../orders/orders.service';
import { CustomerAccessGuard, type StoreCustomer } from './customer-access.guard';
import { OptionalCustomerGuard } from './optional-customer.guard';
import { CurrentStoreCustomer } from './current-store-customer.decorator';
import { StoreTenantGuard } from './store-tenant.guard';
import { AdminOrderQueryDto, CancelOrderDto } from '../orders/dto/order.dto';

function orderAccessTokenFromRequest(request: Request): string | undefined {
  const header = request.headers['x-order-access-token'];
  const fromHeader = (Array.isArray(header) ? header[0] : header)?.trim();
  if (fromHeader) {
    return fromHeader;
  }
  const cookie = request.cookies?.jce_order_access;
  return typeof cookie === 'string' && cookie.trim() ? cookie.trim() : undefined;
}

@Controller('store/orders')
@ApiTags('store')
@Public()
@ApiHeader({ name: 'X-Tenant-Slug', required: true })
@ApiBearerAuth('access-token')
export class StoreOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @UseGuards(StoreTenantGuard, CustomerAccessGuard)
  @ApiOperation({ summary: 'List orders for the authenticated customer' })
  findAll(
    @TenantId() tenantId: string,
    @CurrentStoreCustomer() customer: StoreCustomer,
    @Query() query: AdminOrderQueryDto,
  ) {
    return this.orders.findForCustomer(tenantId, customer.customerId, query);
  }

  @Get(':id')
  @UseGuards(StoreTenantGuard, OptionalCustomerGuard)
  @ApiOperation({ summary: 'Get one order with tracking via customer JWT or guest order access token' })
  findById(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Req() request: Request & { storeCustomer?: StoreCustomer },
  ) {
    const customerId = request.storeCustomer?.customerId;
    const orderAccessToken = orderAccessTokenFromRequest(request);
    return this.orders.findStoreOrder(tenantId, id, { customerId, orderAccessToken });
  }

  @Post(':id/cancel')
  @UseGuards(StoreTenantGuard, CustomerAccessGuard)
  @ApiOperation({ summary: 'Cancel a customer order before fulfillment and release reserved stock' })
  cancel(
    @TenantId() tenantId: string,
    @CurrentStoreCustomer() customer: StoreCustomer,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @Req() request: Request,
  ) {
    return this.orders.cancelForCustomer(tenantId, customer.customerId, id, dto, requestMeta(request));
  }
}
