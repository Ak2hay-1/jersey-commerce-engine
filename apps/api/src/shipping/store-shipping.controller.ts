import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { StoreTenantGuard, cartTokenFromRequest } from '../store/store-tenant.guard';
import { StoreShippingService } from './store-shipping.service';
import { StoreShippingPincodeDto, StoreShippingQuoteDto } from './dto/shipping.dto';

@Controller('store/shipping')
@ApiTags('store')
@Public()
@UseGuards(StoreTenantGuard)
@ApiHeader({ name: 'X-Tenant-Slug', required: true })
export class StoreShippingController {
  constructor(private readonly shipping: StoreShippingService) {}

  @Post('serviceability')
  @ApiOperation({ summary: 'Check Delhivery pincode serviceability' })
  serviceability(@TenantId() tenantId: string, @Body() dto: StoreShippingPincodeDto) {
    return this.shipping.serviceability(tenantId, dto.postalCode);
  }

  @Post('quote')
  @ApiOperation({ summary: 'Quote Delhivery shipping rates for the active cart' })
  quote(@TenantId() tenantId: string, @Req() request: Request, @Body() dto: StoreShippingQuoteDto) {
    return this.shipping.quote(tenantId, cartTokenFromRequest(request), dto.postalCode, dto.mode, dto.cod);
  }
}
