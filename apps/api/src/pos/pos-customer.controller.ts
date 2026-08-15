import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import { CustomersService } from '../customers/customers.service';
import { CustomerQueryDto } from '../customers/dto/customer-query.dto';

@Controller('pos/customers')
@ApiTags('pos')
@TenantScoped()
@RequirePermissions('pos.access', 'customers.read')
export class PosCustomerController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Fast POS customer lookup by name, phone, or email. Walk-in sales do not require a customer.' })
  search(@TenantId() tenantId: string, @Query() query: CustomerQueryDto) {
    return this.customers.searchForPos(tenantId, query);
  }
}
