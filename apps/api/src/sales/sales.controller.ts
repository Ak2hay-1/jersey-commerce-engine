import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import { SalesService } from './sales.service';
import { SaleQueryDto } from './dto/sale-query.dto';

@Controller('sales')
@ApiTags('sales')
@TenantScoped()
@RequirePermissions('sales.read')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @ApiOperation({ summary: 'List POS sales for the current tenant' })
  findAll(@TenantId() tenantId: string, @Query() query: SaleQueryDto) {
    return this.salesService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a sale with items and payments' })
  findById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.salesService.findById(tenantId, id);
  }
}
