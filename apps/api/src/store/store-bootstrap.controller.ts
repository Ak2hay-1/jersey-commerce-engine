import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { StoreTenantGuard } from './store-tenant.guard';
import { StoreBootstrapService } from './store-bootstrap.service';
import { StoreResolveQueryDto } from './dto/store-catalog-query.dto';

@Controller('store')
@ApiTags('store')
@Public()
export class StoreBootstrapController {
  constructor(private readonly bootstrap: StoreBootstrapService) {}

  @Get('resolve')
  @ApiOperation({ summary: 'Resolve a tenant from slug, configured domain, or platform subdomain' })
  resolve(@Query() query: StoreResolveQueryDto) {
    return this.bootstrap.resolve({ slug: query.slug, host: query.host });
  }

  @Get('bootstrap')
  @UseGuards(StoreTenantGuard)
  @ApiHeader({ name: 'X-Tenant-Slug', required: false })
  @ApiOperation({ summary: 'Load storefront branding, navigation, and homepage configuration' })
  getBootstrap(@TenantId() tenantId: string) {
    return this.bootstrap.bootstrap(tenantId);
  }
}
