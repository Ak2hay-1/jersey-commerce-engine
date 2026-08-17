import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import { CancelSaleDto, CompleteSaleDto, PosSaleQueryDto } from './dto/sale.dto';
import { RefundSaleDto } from './dto/refund.dto';
import { PosRefundService } from './pos-refund.service';
import { PosSaleService } from './pos-sale.service';

class ReceiptQueryDto {
  @IsOptional()
  @IsIn(['json', 'html', 'thermal', 'pdf', 'email'])
  format?: 'json' | 'html' | 'thermal' | 'pdf' | 'email';
}

@Controller('pos/sales')
@ApiTags('pos')
@TenantScoped()
@RequirePermissions('pos.access')
export class PosSaleController {
  constructor(
    private readonly sales: PosSaleService,
    private readonly refunds: PosRefundService,
  ) {}

  @Post('complete')
  @RequirePermissions('pos.access', 'sales.create', 'payments.create')
  @ApiOperation({ summary: 'Finalize the POS cart as a completed sale, payment, and inventory movement' })
  complete(@CurrentUser() actor: AuthPrincipal, @Body() dto: CompleteSaleDto) {
    return this.sales.complete(actor, dto);
  }

  @Get()
  @RequirePermissions('pos.access', 'sales.read')
  @ApiOperation({ summary: 'List POS sales with filters. Cashiers see their own sales.' })
  findAll(@CurrentUser() actor: AuthPrincipal, @Query() query: PosSaleQueryDto) {
    return this.sales.findAll(actor, query);
  }

  @Get(':id')
  @RequirePermissions('pos.access', 'sales.read')
  @ApiOperation({ summary: 'Get a POS sale with items, payments, and refunds' })
  findById(@CurrentUser() actor: AuthPrincipal, @Param('id') id: string) {
    return this.sales.findById(actor, id);
  }

  @Get(':id/receipt')
  @RequirePermissions('pos.access', 'sales.read')
  @ApiOperation({ summary: 'Structured or printable receipt for a completed sale. Printing cannot change the sale.' })
  receipt(@CurrentUser() actor: AuthPrincipal, @Param('id') id: string, @Query() query: ReceiptQueryDto) {
    return this.sales.receipt(actor, id, query.format ?? 'json');
  }

  @Post(':id/refund')
  @RequirePermissions('pos.access', 'sales.refund', 'payments.refund')
  @ApiOperation({ summary: 'Full or partial refund of a completed sale. Original sale rows are preserved.' })
  refund(@CurrentUser() actor: AuthPrincipal, @Param('id') id: string, @Body() dto: RefundSaleDto) {
    return this.refunds.refund(actor, id, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancel a completed sale, preserve history, reverse remaining inventory, and record payment reversals.',
  })
  cancel(@CurrentUser() actor: AuthPrincipal, @Param('id') id: string, @Body() dto: CancelSaleDto) {
    return this.sales.cancel(actor, id, dto);
  }
}
