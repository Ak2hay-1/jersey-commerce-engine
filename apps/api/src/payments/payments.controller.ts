import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import { CreatePaymentDto, PaymentQueryDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
@ApiTags('payments')
@TenantScoped()
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post()
  @RequirePermissions('payments.create')
  @ApiOperation({ summary: 'Record a cashier-confirmed payment against a sale. Gateways are not simulated.' })
  create(@CurrentUser() actor: AuthPrincipal, @Body() dto: CreatePaymentDto) {
    return this.service.create(actor, dto);
  }

  @Get()
  @RequirePermissions('payments.read')
  @ApiOperation({ summary: 'List payments for the current tenant with filters' })
  findAll(@CurrentUser() actor: AuthPrincipal, @Query() query: PaymentQueryDto) {
    return this.service.findAll(actor, query);
  }

  @Get(':id')
  @RequirePermissions('payments.read')
  @ApiOperation({ summary: 'Get a payment by id' })
  findById(@CurrentUser() actor: AuthPrincipal, @Param('id') id: string) {
    return this.service.findById(actor, id);
  }
}
