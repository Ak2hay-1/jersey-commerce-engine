import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReceiptService, saleReceiptInclude } from '../receipts/receipt.service';
import type { ReceiptPayload } from '../receipts/receipt-format';
import {
  invoiceFromOrder,
  invoiceFromSalePayload,
  sampleInvoice,
  type InvoiceDocument,
} from '../receipts/invoice-document';
import type { InvoiceKind } from './invoice-link.service';

export type BuiltInvoice = {
  document: InvoiceDocument;
  phone: string | null;
  customerName: string;
  number: string;
  total: string;
};

@Injectable()
export class InvoiceBuilderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly receipts: ReceiptService,
  ) {}

  async build(tenantId: string, kind: InvoiceKind, id: string): Promise<BuiltInvoice> {
    if (kind === 'SALE') {
      return this.forSale(tenantId, id);
    }
    if (kind === 'ORDER') {
      return this.forOrder(tenantId, id);
    }
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    const document = sampleInvoice(tenant?.name ?? 'Jerzyfy');
    return { document, phone: null, customerName: 'Test Customer', number: document.invoiceNumber, total: document.total };
  }

  async forSale(tenantId: string, saleId: string): Promise<BuiltInvoice> {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      include: saleReceiptInclude,
    });
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    const payload =
      sale.receiptPayload && typeof sale.receiptPayload === 'object'
        ? (sale.receiptPayload as unknown as ReceiptPayload)
        : this.receipts.buildPayload(sale);
    const document = invoiceFromSalePayload(payload);
    return {
      document,
      phone: sale.customer?.phone ?? payload.transaction.customerPhone ?? null,
      customerName: sale.customer?.name?.trim() || 'Customer',
      number: sale.invoiceNumber,
      total: document.total,
    };
  }

  async forOrder(tenantId: string, orderId: string): Promise<BuiltInvoice> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        tenant: {
          select: {
            name: true,
            address: true,
            city: true,
            state: true,
            postalCode: true,
            contactPhone: true,
            contactEmail: true,
          },
        },
        customer: { select: { name: true, phone: true } },
        shippingAddress: true,
        items: true,
        payments: { select: { method: true, status: true, amount: true, reference: true } },
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    const document = invoiceFromOrder(order);
    return {
      document,
      phone: order.shippingAddress?.phone || order.customer?.phone || null,
      customerName: order.shippingAddress?.fullName?.trim() || order.customer?.name?.trim() || 'Customer',
      number: order.orderNumber,
      total: document.total,
    };
  }
}
