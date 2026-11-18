import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { StoreTenantGuard } from './store-tenant.guard';
import { StoreContactMessageDto } from './dto/store-contact.dto';
import { StoreContactService } from './store-contact.service';

@Controller('store')
@ApiTags('store')
@Public()
@UseGuards(StoreTenantGuard)
@ApiHeader({ name: 'X-Tenant-Slug', required: false })
export class StoreContactController {
  constructor(private readonly contact: StoreContactService) {}

  @Post('contact')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Submit a storefront contact message for staff follow-up' })
  submit(@TenantId() tenantId: string, @Body() dto: StoreContactMessageDto) {
    return this.contact.submit(tenantId, dto);
  }
}
