import { Global, Module } from '@nestjs/common';
import { ReceiptsModule } from '../receipts/receipts.module';
import { InvoiceBuilderService } from './invoice-builder.service';
import { InvoiceLinkService } from './invoice-link.service';
import { Msg91WhatsappClient } from './msg91-whatsapp.client';
import { PublicInvoicesController } from './public-invoices.controller';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappReceiptService } from './whatsapp-receipt.service';

@Global()
@Module({
  imports: [ReceiptsModule],
  controllers: [WhatsappController, PublicInvoicesController],
  providers: [InvoiceBuilderService, InvoiceLinkService, Msg91WhatsappClient, WhatsappReceiptService],
  exports: [WhatsappReceiptService],
})
export class WhatsappModule {}
