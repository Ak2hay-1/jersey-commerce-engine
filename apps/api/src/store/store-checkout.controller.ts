import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { requestMeta } from '../auth/auth-session.service';
import { StoreCheckoutService } from './store-checkout.service';
import { StoreTenantGuard, cartTokenFromRequest, idempotencyKeyFromRequest } from './store-tenant.guard';
import { StoreCheckoutDto } from '../orders/dto/order.dto';

@Controller('store')
@ApiTags('store')
@Public()
@UseGuards(StoreTenantGuard)
@ApiHeader({ name: 'X-Tenant-Slug', required: true })
@ApiHeader({ name: 'X-Cart-Token', required: false })
@ApiHeader({ name: 'Idempotency-Key', required: false })
export class StoreCheckoutController {
  constructor(private readonly checkout: StoreCheckoutService) {}

  @Post('checkout')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Convert the current cart into a PENDING order, reserve stock, and create a payment intent',
  })
  checkoutCart(@TenantId() tenantId: string, @Req() request: Request, @Body() dto: StoreCheckoutDto) {
    return this.checkout.checkout(
      tenantId,
      cartTokenFromRequest(request),
      dto,
      idempotencyKeyFromRequest(request),
      requestMeta(request),
    );
  }
}
