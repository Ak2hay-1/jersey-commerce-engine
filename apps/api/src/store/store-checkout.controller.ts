import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { Request } from 'express';
import { FULFILLMENT_METHODS } from '@jersey-commerce/types';
import { Public } from '../common/decorators/public.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { requestMeta } from '../auth/auth-session.service';
import { StoreCheckoutService } from './store-checkout.service';
import { StoreTenantGuard, cartTokenFromRequest, idempotencyKeyFromRequest } from './store-tenant.guard';
import { OptionalCustomerGuard } from './optional-customer.guard';
import { StoreCheckoutDto } from '../orders/dto/order.dto';
import type { StoreCustomer } from './customer-access.guard';

class StoreQuoteDto {
  @ApiPropertyOptional({ enum: FULFILLMENT_METHODS })
  @IsOptional()
  @IsIn(FULFILLMENT_METHODS)
  fulfillmentMethod?: (typeof FULFILLMENT_METHODS)[number];
}

@Controller('store')
@ApiTags('store')
@Public()
@UseGuards(StoreTenantGuard, OptionalCustomerGuard)
@ApiHeader({ name: 'X-Tenant-Slug', required: false })
@ApiHeader({ name: 'X-Cart-Token', required: false })
@ApiHeader({ name: 'Idempotency-Key', required: false })
@ApiBearerAuth('access-token')
export class StoreCheckoutController {
  constructor(private readonly checkout: StoreCheckoutService) {}

  @Post('checkout/quote')
  @ApiOperation({ summary: 'Reprice the current cart from live catalog data without creating an order' })
  quote(@TenantId() tenantId: string, @Req() request: Request, @Body() dto: StoreQuoteDto) {
    return this.checkout.quote(tenantId, cartTokenFromRequest(request), dto.fulfillmentMethod ?? 'DELIVERY');
  }

  @Post('checkout')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Convert the current cart into a PENDING order, reserve stock, and create a payment intent',
  })
  checkoutCart(@TenantId() tenantId: string, @Req() request: Request, @Body() dto: StoreCheckoutDto) {
    const customer = (request as Request & { storeCustomer?: StoreCustomer }).storeCustomer;
    return this.checkout.checkout(
      tenantId,
      cartTokenFromRequest(request),
      dto,
      idempotencyKeyFromRequest(request),
      requestMeta(request),
      customer?.customerId,
    );
  }
}
