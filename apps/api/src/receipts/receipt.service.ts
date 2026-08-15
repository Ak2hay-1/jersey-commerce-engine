import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { moneyString } from '../pos/pos-money';
import { renderReceiptHtml, type ReceiptPayload } from './receipt-format';
import { canViewAllPosData } from '../pos/pos-money';
import type { AuthPrincipal } from '../common/context/request-context';

const saleReceiptInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  cashier: { select: { id: true, name: true, email: true } },
  tenant: {
    select: {
      name: true,
      logo: true,
      address: true,
      contactPhone: true,
      contactEmail: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      currency: true,
    },
  },
  items: true,
  payments: true,
} satisfies Prisma.SaleInclude;

@Injectable()
export class ReceiptService {
  constructor(private readonly prisma: PrismaService) {}

  buildPayload(sale: {
    id: string;
    invoiceNumber: string;
    createdAt: Date;
    status: string;
    posSessionId: string | null;
    subtotal: { toFixed: (digits: number) => string };
    discount: { toFixed: (digits: number) => string };
    discountType: string;
    discountValue: { toFixed: (digits: number) => string };
    tax: { toFixed: (digits: number) => string };
    taxInclusive: boolean;
    total: { toFixed: (digits: number) => string };
    customer?: { name: string; phone: string | null } | null;
    cashier?: { name: string } | null;
    tenant: {
      name: string;
      logo: string | null;
      address: string | null;
      contactPhone: string | null;
      contactEmail: string | null;
      city: string | null;
      state: string | null;
      postalCode: string | null;
      country: string;
      currency: string;
    };
    items: Array<{
      productName: string;
      sku: string;
      size: string | null;
      color: string | null;
      quantity: number;
      unitPrice: { toFixed: (digits: number) => string };
      discount: { toFixed: (digits: number) => string };
      tax: { toFixed: (digits: number) => string };
      total: { toFixed: (digits: number) => string };
    }>;
    payments: Array<{
      method: string;
      amount: { toFixed: (digits: number) => string };
      amountReceived: { toFixed: (digits: number) => string } | null;
      changeDue: { toFixed: (digits: number) => string } | null;
      reference: string | null;
      provider: string | null;
    }>;
  }): ReceiptPayload {
    return {
      business: {
        name: sale.tenant.name,
        logo: sale.tenant.logo,
        address: sale.tenant.address,
        phone: sale.tenant.contactPhone,
        email: sale.tenant.contactEmail,
        city: sale.tenant.city,
        state: sale.tenant.state,
        postalCode: sale.tenant.postalCode,
        country: sale.tenant.country,
        currency: sale.tenant.currency,
      },
      transaction: {
        saleId: sale.id,
        invoiceNumber: sale.invoiceNumber,
        datetime: sale.createdAt.toISOString(),
        cashierName: sale.cashier?.name ?? null,
        posSessionId: sale.posSessionId,
        status: sale.status,
        customerName: sale.customer?.name ?? null,
        customerPhone: sale.customer?.phone ?? null,
      },
      items: sale.items.map((item) => ({
        productName: item.productName,
        variant: [item.size, item.color].filter(Boolean).join(' / ') || null,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: moneyString(item.unitPrice),
        discount: moneyString(item.discount),
        tax: moneyString(item.tax),
        lineTotal: moneyString(item.total),
      })),
      totals: {
        subtotal: moneyString(sale.subtotal),
        discount: moneyString(sale.discount),
        discountType: sale.discountType,
        discountValue: moneyString(sale.discountValue),
        tax: moneyString(sale.tax),
        taxInclusive: sale.taxInclusive,
        total: moneyString(sale.total),
      },
      payments: sale.payments.map((payment) => ({
        method: payment.method,
        amount: moneyString(payment.amount),
        amountReceived: payment.amountReceived ? moneyString(payment.amountReceived) : null,
        changeDue: payment.changeDue ? moneyString(payment.changeDue) : null,
        reference: payment.reference,
        provider: payment.provider,
      })),
      barcode: sale.invoiceNumber,
    };
  }

  async issue(
    tx: Prisma.TransactionClient,
    tenantId: string,
    saleId: string,
  ): Promise<ReceiptPayload> {
    const sale = await tx.sale.findFirst({
      where: { id: saleId, tenantId },
      include: saleReceiptInclude,
    });
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    const payload = this.buildPayload(sale);
    await tx.sale.update({
      where: { id: saleId },
      data: { receiptPayload: payload as unknown as Prisma.InputJsonValue, receiptIssuedAt: new Date() },
    });
    return payload;
  }

  async get(actor: AuthPrincipal, saleId: string, format: 'json' | 'html' | 'thermal' | 'pdf' | 'email' = 'json') {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId: actor.tenantId },
      include: saleReceiptInclude,
    });
    if (!sale || (!canViewAllPosData(actor) && sale.cashierId !== actor.userId)) {
      throw new NotFoundException('Sale not found');
    }
    const payload =
      sale.receiptPayload && typeof sale.receiptPayload === 'object'
        ? (sale.receiptPayload as unknown as ReceiptPayload)
        : this.buildPayload(sale);

    if (format === 'html') {
      return { format, contentType: 'text/html', html: renderReceiptHtml(payload, 'print'), data: payload };
    }
    if (format === 'thermal') {
      return { format, contentType: 'text/html', html: renderReceiptHtml(payload, 'thermal'), data: payload };
    }
    if (format === 'pdf' || format === 'email') {
      return {
        format,
        prepared: true,
        available: false,
        message:
          format === 'pdf'
            ? 'PDF receipt rendering is prepared and not generated in this phase.'
            : 'Email receipt delivery is prepared and not sent in this phase.',
        data: payload,
      };
    }
    return { format: 'json', data: payload };
  }
}
