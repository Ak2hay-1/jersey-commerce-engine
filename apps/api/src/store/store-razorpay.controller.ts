import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { Public } from '../common/decorators/public.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { StoreTenantGuard } from './store-tenant.guard';
import { RazorpayOnlineGateway } from '../orders/razorpay-online.gateway';

class CreateRazorpayOrderDto {
  @ApiProperty({ description: 'Amount in paise (minimum 100)', example: 50000 })
  @IsInt()
  @Min(100)
  amount!: number;

  @ApiPropertyOptional({ example: 'INR' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  currency?: string;

  @ApiPropertyOptional({ example: 'receipt_001' })
  @IsOptional()
  @IsString()
  receipt?: string;
}

class VerifyRazorpayPaymentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  razorpay_order_id!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  razorpay_payment_id!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  razorpay_signature!: string;
}

/**
 * Razorpay Standard Checkout endpoints (framework equivalent of /api/create-order
 * and /api/verify-payment under the Nest global prefix api/v1).
 */
@Controller('store/razorpay')
@ApiTags('store-razorpay')
@Public()
@UseGuards(StoreTenantGuard)
@ApiHeader({ name: 'X-Tenant-Slug', required: false })
export class StoreRazorpayController {
  constructor(private readonly razorpay: RazorpayOnlineGateway) {}

  @Post('create-order')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create a Razorpay order (amount in paise)' })
  createOrder(@TenantId() tenantId: string, @Body() dto: CreateRazorpayOrderDto) {
    return this.razorpay.createRazorpayOrderForAmount(tenantId, {
      amountPaise: dto.amount,
      currency: dto.currency,
      receipt: dto.receipt,
    });
  }

  @Post('verify-payment')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Verify Razorpay payment signature and mark the order paid' })
  verifyPayment(@TenantId() tenantId: string, @Body() dto: VerifyRazorpayPaymentDto) {
    return this.razorpay.verifyCheckoutPayment(tenantId, dto);
  }
}
