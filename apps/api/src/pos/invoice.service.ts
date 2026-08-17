import { Injectable } from '@nestjs/common';
import { DOCUMENT_TYPES, nextDocumentNumber } from '../documents/document-sequence';

@Injectable()
export class InvoiceService {
  nextSaleInvoice(tx: object, tenantId: string): Promise<string> {
    return nextDocumentNumber(tx, tenantId, DOCUMENT_TYPES.SALE_INVOICE);
  }
}
