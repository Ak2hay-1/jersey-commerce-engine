import { Controller, Get, NotFoundException, Param, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { renderInvoicePdf } from '../receipts/invoice-pdf';
import { InvoiceBuilderService } from './invoice-builder.service';
import { InvoiceLinkService } from './invoice-link.service';

@Controller('public/invoices')
@ApiTags('public-invoices')
@Public()
export class PublicInvoicesController {
  constructor(
    private readonly links: InvoiceLinkService,
    private readonly builder: InvoiceBuilderService,
  ) {}

  @Get(':file')
  @ApiOperation({ summary: 'Download a signed invoice PDF (used by WhatsApp receipts)' })
  async download(@Param('file') file: string): Promise<StreamableFile> {
    const payload = this.links.verify(file);
    if (!payload) {
      throw new NotFoundException('Invoice link is invalid or has expired.');
    }
    const built = await this.builder.build(payload.t, payload.k, payload.id);
    const pdf = await renderInvoicePdf(built.document);
    const filename = `${built.number.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf`;
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `inline; filename="${filename}"`,
      length: pdf.length,
    });
  }
}
