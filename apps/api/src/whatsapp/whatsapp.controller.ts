import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { TenantScoped } from '../common/guards/tenant.guard';
import type { AuthPrincipal } from '../common/context/request-context';
import { WhatsappSendReceiptDto, WhatsappTestDto } from '../notification-settings/dto/update-notification-settings.dto';
import { WhatsappReceiptService } from './whatsapp-receipt.service';

@Controller()
@ApiTags('whatsapp')
@TenantScoped()
export class WhatsappController {
  constructor(private readonly receipts: WhatsappReceiptService) {}

  @Post('notification-settings/whatsapp/test')
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Send a sample PDF bill on WhatsApp via MSG91' })
  test(@TenantId() tenantId: string, @Body() dto: WhatsappTestDto) {
    return this.receipts.sendTest(tenantId, dto.phone);
  }

  @Get('orders/:id/whatsapp-receipt')
  @RequirePermissions('orders.read')
  @ApiOperation({ summary: 'WhatsApp receipt delivery status for an order' })
  orderStatus(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.receipts.orderStatus(tenantId, id);
  }

  @Post('orders/:id/whatsapp-receipt')
  @RequirePermissions('orders.update')
  @ApiOperation({ summary: 'Send (or resend) the order bill PDF on WhatsApp' })
  sendOrder(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: WhatsappSendReceiptDto) {
    return this.receipts.sendOrder(tenantId, id, dto.phone);
  }

  @Post('pos/sales/:id/whatsapp-receipt')
  @RequirePermissions('pos.access', 'sales.read')
  @ApiOperation({ summary: 'Send (or resend) the POS sale bill PDF on WhatsApp' })
  sendSale(@CurrentUser() actor: AuthPrincipal, @Param('id') id: string, @Body() dto: WhatsappSendReceiptDto) {
    return this.receipts.sendSale(actor, id, dto.phone);
  }
}
