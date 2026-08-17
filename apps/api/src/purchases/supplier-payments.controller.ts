import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import { SupplierPaymentsService } from './supplier-payments.service';
import { CreateSupplierPaymentDto, SupplierPaymentQueryDto } from './dto/supplier-payment.dto';

@Controller('supplier-payments')
@ApiTags('supplier-payments')
@TenantScoped()
export class SupplierPaymentsController {
  constructor(private readonly payments: SupplierPaymentsService) {}

  @Get()
  @RequirePermissions('supplierPayments.read')
  @ApiOperation({ summary: 'List supplier payments for the current tenant' })
  findAll(@TenantId() tenantId: string, @Query() query: SupplierPaymentQueryDto) {
    return this.payments.findAll(tenantId, query);
  }

  @Post()
  @RequirePermissions('supplierPayments.create')
  @ApiOperation({ summary: 'Record a payment to a supplier. Card and bank credentials are not stored.' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateSupplierPaymentDto,
    @CurrentUser() actor: AuthPrincipal,
  ) {
    return this.payments.create(tenantId, dto, actor);
  }
}
