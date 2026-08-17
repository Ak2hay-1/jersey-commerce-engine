import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { requestMeta } from '../auth/auth-session.service';
import { OrdersService } from '../orders/orders.service';
import { CustomerAccessGuard } from './customer-access.guard';
import { CurrentStoreCustomer } from './current-store-customer.decorator';
import type { StoreCustomer } from './customer-access.guard';
import { StoreTenantGuard } from './store-tenant.guard';
import { AdminOrderQueryDto, CancelOrderDto } from '../orders/dto/order.dto';

@Controller('store/orders')
@ApiTags('store')
@Public()
@UseGuards(StoreTenantGuard, CustomerAccessGuard)
@ApiHeader({ name: 'X-Tenant-Slug', required: true })
@ApiBearerAuth('access-token')
export class StoreOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders for the authenticated customer' })
  findAll(
    @TenantId() tenantId: string,
    @CurrentStoreCustomer() customer: StoreCustomer,
    @Query() query: AdminOrderQueryDto,
  ) {
    return this.orders.findForCustomer(tenantId, customer.customerId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one customer order with tracking. Other customers’ orders are not visible.' })
  findById(
    @TenantId() tenantId: string,
    @CurrentStoreCustomer() customer: StoreCustomer,
    @Param('id') id: string,
  ) {
    return this.orders.findCustomerOrder(tenantId, customer.customerId, id);
  }

  @Post(':id/cancel')
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
