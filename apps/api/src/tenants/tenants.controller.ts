import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { TenantQueryDto } from './tenants.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthPrincipal } from '../common/context/request-context';
import { toPaginationMeta } from '../common/dto/pagination-query.dto';

@Controller('tenants')
@ApiTags('tenants')
@ApiBearerAuth('access-token')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get the authenticated user tenant' })
  @ApiOkResponse({ description: 'Current tenant summary' })
  findCurrent(@CurrentUser() user: AuthPrincipal) {
    return this.tenantsService.findById(user.tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List the current tenant only. Other tenants are never returned.' })
  @ApiOkResponse({ description: 'Paginated tenant summaries restricted to the caller tenant' })
  async findAll(@CurrentUser() user: AuthPrincipal, @Query() query: TenantQueryDto) {
    const tenant = await this.tenantsService.findById(user.tenantId);
    if (query.slug && query.slug !== tenant.slug) {
      throw new NotFoundException('Tenant not found');
    }
    return {
      items: [tenant],
      meta: toPaginationMeta(query.page ?? 1, query.pageSize ?? 20, 1),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get the current tenant by id' })
  findById(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    if (id !== user.tenantId) {
      throw new NotFoundException('Tenant not found');
    }
    return this.tenantsService.findById(id);
  }
}
