import { Body, Controller, Headers, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import { requestMeta } from '../auth/auth-session.service';
import { ShipmentsService } from './shipments.service';

@Controller()
@ApiTags('shipments')
export class ShipmentsController {
  constructor(private readonly shipments: ShipmentsService) {}

  @Post('orders/:id/shipments')
  @ApiBearerAuth('access-token')
  @TenantScoped()
  @RequirePermissions('orders.update')
  @ApiOperation({ summary: 'Create Delhivery shipment(s) for a confirmed delivery order' })
  create(@CurrentUser() actor: AuthPrincipal, @Param('id') id: string, @Req() request: Request) {
    return this.shipments.createForOrder(actor, id, requestMeta(request));
  }

  @Post('orders/:id/shipments/refresh')
  @ApiBearerAuth('access-token')
  @TenantScoped()
  @RequirePermissions('orders.update')
  @ApiOperation({ summary: 'Refresh Delhivery tracking and label for an order shipment' })
  refresh(@CurrentUser() actor: AuthPrincipal, @Param('id') id: string) {
    return this.shipments.refresh(actor, id);
  }

  @Post('webhooks/delhivery')
  @Public()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @ApiOperation({ summary: 'Delhivery shipment status webhook' })
  @ApiHeader({ name: 'X-Delhivery-Secret', required: true })
  webhook(
    @Headers('x-delhivery-secret') secret: string | undefined,
    @Body() body: Record<string, unknown>,
    @Req() request: Request,
  ) {
    return this.shipments.handleWebhook(secret, body ?? {}, requestMeta(request));
  }
}
