import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import { PosLookupQueryDto } from './dto/lookup.dto';
import { PosLookupService } from './pos-lookup.service';

@Controller('pos/products')
@ApiTags('pos')
@TenantScoped()
@RequirePermissions('pos.access')
export class PosLookupController {
  constructor(private readonly lookup: PosLookupService) {}

  @Get()
  @ApiOperation({ summary: 'Fast POS lookup by product name, SKU, or barcode' })
  search(@Query() query: PosLookupQueryDto) {
    return this.lookup.search(query);
  }

  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Exact barcode lookup for scanner input' })
  async barcode(@Param('barcode') barcode: string) {
    const item = await this.lookup.barcode(barcode);
    if (!item) {
      throw new NotFoundException('No product matches this barcode.');
    }
    return item;
  }
}
