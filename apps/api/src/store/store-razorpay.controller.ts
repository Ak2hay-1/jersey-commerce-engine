import { Body, Controller, Headers, HttpCode, HttpStatus, Inject, Post, Req, UseGuards, forwardRef } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiHeader, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsString, MinLength } from 'class-validator';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { StoreTenantGuard } from './store-tenant.guard';
import { RazorpayOnlineGateway } from '../orders/razorpay-online.gateway';
import { ShipmentsService } from '../shipping/shipments.service';
import { WhatsappReceiptService } from '../whatsapp/whatsapp-receipt.service';

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
 * Razorpay Standard Checkout verification. Razorpay orders are only ever created server-side during checkout,
 * tied to a real Jerzyfy order and amount.
 */
@Controller('store/razorpay')
@ApiTags('store-razorpay')
@Public()
@UseGuards(StoreTenantGuard)
@ApiHeader({ name: 'X-Tenant-Slug', required: false })
export class StoreRazorpayController {
  constructor(
    private readonly razorpay: RazorpayOnlineGateway,
    @Inject(forwardRef(() => ShipmentsService))
    private readonly shipments: ShipmentsService,
    private readonly whatsappReceipts: WhatsappReceiptService,
  ) {}

  @Post('verify-payment')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Verify Razorpay payment signature and mark the order paid' })
  async verifyPayment(@TenantId() tenantId: string, @Body() dto: VerifyRazorpayPaymentDto) {
    const result = await this.razorpay.verifyCheckoutPayment(tenantId, dto);
    if (result.orderId && result.fulfillmentMethod === 'DELIVERY') {
      await this.shipments.tryAutoCreateForOrder(tenantId, result.orderId);
    }
    if (result.orderId) {
      this.whatsappReceipts.scheduleOrderReceipt(tenantId, result.orderId);
    }
    return {
      success: result.success,
      paymentId: result.paymentId,
      orderNumber: result.orderNumber,
    };
  }
}

@Controller('webhooks/razorpay')
@ApiTags('store-razorpay')
@Public()
export class RazorpayWebhookController {
  constructor(
    private readonly razorpay: RazorpayOnlineGateway,
    @Inject(forwardRef(() => ShipmentsService))
    private readonly shipments: ShipmentsService,
    private readonly whatsappReceipts: WhatsappReceiptService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  @ApiExcludeEndpoint()
  async webhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string | undefined,
    @Headers('x-razorpay-event-id') eventId: string | undefined,
  ) {
    const result = await this.razorpay.handleWebhook(request.rawBody, signature, eventId);
    if (result.captured) {
      const { tenantId, orderId, fulfillmentMethod } = result.captured;
      if (fulfillmentMethod === 'DELIVERY') {
        await this.shipments.tryAutoCreateForOrder(tenantId, orderId).catch(() => undefined);
      }
      this.whatsappReceipts.scheduleOrderReceipt(tenantId, orderId);
    }
    return { ok: result.ok, handled: result.handled };
  }
}
