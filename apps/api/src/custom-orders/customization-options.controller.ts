import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import { CustomOrdersService } from './custom-orders.service';
import { CustomizationOptionDto } from './dto/custom-order.dto';

@Controller('customization-options')
@ApiTags('customization-options')
@ApiBearerAuth('access-token')
@TenantScoped()
export class CustomizationOptionsController {
  constructor(private readonly customOrders: CustomOrdersService) {}

  @Get()
  @RequirePermissions('customOrders.read')
  @ApiOperation({ summary: 'List tenant customization options' })
  list(@TenantId() tenantId: string) {
    return this.customOrders.listOptions(tenantId);
  }

  @Post()
  @RequirePermissions('customOrders.update')
  @ApiOperation({ summary: 'Create a configurable customization option. Pricing is tenant data.' })
  create(@CurrentUser() actor: AuthPrincipal, @Body() dto: CustomizationOptionDto) {
    return this.customOrders.createOption(actor, dto);
  }

  @Patch(':id')
  @RequirePermissions('customOrders.update')
  @ApiOperation({ summary: 'Update a customization option name, pricing type, or price' })
  update(@CurrentUser() actor: AuthPrincipal, @Param('id') id: string, @Body() dto: CustomizationOptionDto) {
    return this.customOrders.updateOption(actor, id, dto);
  }
}
