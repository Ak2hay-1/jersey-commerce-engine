import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { WhatsappReceiptStatus } from '@jersey-commerce/types';
import { Prisma } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationSettingsService, type WhatsappConfig } from '../notification-settings/notification-settings.service';
import type { AuthPrincipal } from '../common/context/request-context';
import { canViewAllPosData } from '../pos/pos-money';
import { InvoiceBuilderService } from './invoice-builder.service';
import { InvoiceLinkService, type InvoiceKind } from './invoice-link.service';
import { Msg91WhatsappClient, toWhatsappIndia } from './msg91-whatsapp.client';

type MessageKind = 'SALE_RECEIPT' | 'ORDER_RECEIPT';

const KIND_TO_INVOICE: Record<MessageKind, InvoiceKind> = {
  SALE_RECEIPT: 'SALE',
  ORDER_RECEIPT: 'ORDER',
};

const CLAIM_MARKER = 'Sending…';

function displayAmount(value: string): string {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numeric)
    : value;
}

function safeFilename(number: string): string {
  return `${number.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf`;
}

@Injectable()
export class WhatsappReceiptService {
  private readonly logger = new Logger(WhatsappReceiptService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: NotificationSettingsService,
    private readonly builder: InvoiceBuilderService,
    private readonly links: InvoiceLinkService,
    private readonly msg91: Msg91WhatsappClient,
  ) {}

  /** Fire-and-forget auto receipt after a POS sale has committed. */
  scheduleSaleReceipt(tenantId: string, saleId: string): void {
    this.schedule(tenantId, 'SALE_RECEIPT', saleId);
  }

  /** Fire-and-forget auto receipt after a website order is confirmed / paid. */
  scheduleOrderReceipt(tenantId: string, orderId: string): void {
    this.schedule(tenantId, 'ORDER_RECEIPT', orderId);
  }

  private schedule(tenantId: string, kind: MessageKind, referenceId: string): void {
    setImmediate(() => {
      void this.autoSend(tenantId, kind, referenceId).catch((error: unknown) => {
        this.logger.warn(
          `WhatsApp ${kind} failed for ${referenceId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    });
  }

  private async autoSend(tenantId: string, kind: MessageKind, referenceId: string): Promise<void> {
    const { config } = await this.settings.resolveWhatsappConfig(tenantId);
    if (!config) {
      return;
    }
    if ((kind === 'SALE_RECEIPT' && !config.sendPosReceipt) || (kind === 'ORDER_RECEIPT' && !config.sendOrderReceipt)) {
      return;
    }
    try {
      await this.prisma.whatsappMessage.create({
        data: { tenantId, kind, referenceId, status: 'FAILED', error: CLAIM_MARKER, attempts: 0 },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return;
      }
      throw error;
    }
    await this.deliver(tenantId, kind, referenceId, config);
  }

  /** Manual send / resend from admin or POS. Throws with the provider reason on failure. */
  async send(tenantId: string, kind: MessageKind, referenceId: string, phoneOverride?: string): Promise<WhatsappReceiptStatus> {
    const { config, reason } = await this.settings.resolveWhatsappConfig(tenantId, { requireEnabled: false });
    if (!config) {
      throw new BadRequestException(reason ?? 'WhatsApp receipts are not configured.');
    }
    const status = await this.deliver(tenantId, kind, referenceId, config, phoneOverride);
    if (status.status !== 'SENT') {
      throw new BadRequestException(status.error ?? 'WhatsApp receipt was not sent.');
    }
    return status;
  }

  async sendSale(actor: AuthPrincipal, saleId: string, phone?: string): Promise<WhatsappReceiptStatus> {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId: actor.tenantId },
      select: { id: true, cashierId: true },
    });
    if (!sale || (!canViewAllPosData(actor) && sale.cashierId !== actor.userId)) {
      throw new NotFoundException('Sale not found');
    }
    return this.send(actor.tenantId, 'SALE_RECEIPT', sale.id, phone);
  }

  async sendOrder(tenantId: string, orderIdOrNumber: string, phone?: string): Promise<WhatsappReceiptStatus> {
    const orderId = await this.resolveOrderId(tenantId, orderIdOrNumber);
    return this.send(tenantId, 'ORDER_RECEIPT', orderId, phone);
  }

  async orderStatus(tenantId: string, orderIdOrNumber: string): Promise<WhatsappReceiptStatus> {
    const orderId = await this.resolveOrderId(tenantId, orderIdOrNumber);
    return this.status(tenantId, 'ORDER_RECEIPT', orderId);
  }

  async sendTest(tenantId: string, phone: string): Promise<{ ok: true }> {
    const { config, reason } = await this.settings.resolveWhatsappConfig(tenantId, { requireEnabled: false });
    if (!config) {
      throw new BadRequestException(reason ?? 'WhatsApp receipts are not configured.');
    }
    const to = toWhatsappIndia(phone);
    if (!to) {
      throw new BadRequestException('Enter a valid WhatsApp number (10 digits).');
    }
    const built = await this.builder.build(tenantId, 'SAMPLE', 'test');
    const result = await this.msg91.sendReceiptTemplate(config.authKey, {
      integratedNumber: config.integratedNumber,
      templateName: config.templateName,
      namespace: config.namespace,
      language: config.language,
      to,
      documentUrl: this.links.buildUrl(config.publicBaseUrl, tenantId, 'SAMPLE', 'test'),
      documentFilename: safeFilename(built.number),
      customerName: built.customerName,
      billNumber: built.number,
      total: displayAmount(built.total),
    });
    if (!result.ok) {
      throw new BadRequestException(`MSG91: ${result.message}`);
    }
    return { ok: true };
  }

  private async status(tenantId: string, kind: MessageKind, referenceId: string): Promise<WhatsappReceiptStatus> {
    const row = await this.prisma.whatsappMessage.findUnique({
      where: { tenantId_kind_referenceId: { tenantId, kind, referenceId } },
    });
    return {
      status: row?.status ?? null,
      phone: row?.phone ?? null,
      error: row?.error ?? null,
      attempts: row?.attempts ?? 0,
      updatedAt: row?.updatedAt.toISOString() ?? null,
    };
  }

  private async resolveOrderId(tenantId: string, orderIdOrNumber: string): Promise<string> {
    const order = await this.prisma.order.findFirst({
      where: { tenantId, OR: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }] },
      select: { id: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order.id;
  }

  private async deliver(
    tenantId: string,
    kind: MessageKind,
    referenceId: string,
    config: WhatsappConfig,
    phoneOverride?: string,
  ): Promise<WhatsappReceiptStatus> {
    let status: 'SENT' | 'FAILED' | 'SKIPPED';
    let error: string | null = null;
    let providerRef: string | null = null;
    let phone: string | null = null;
    try {
      const built = await this.builder.build(tenantId, KIND_TO_INVOICE[kind], referenceId);
      const rawPhone = phoneOverride?.trim() || built.phone;
      phone = rawPhone ? toWhatsappIndia(rawPhone) : null;
      if (!phone) {
        status = 'SKIPPED';
        error = rawPhone ? `Invalid phone number: ${rawPhone}` : 'No customer phone number on this order.';
      } else {
        const result = await this.msg91.sendReceiptTemplate(config.authKey, {
          integratedNumber: config.integratedNumber,
          templateName: config.templateName,
          namespace: config.namespace,
          language: config.language,
          to: phone,
          documentUrl: this.links.buildUrl(config.publicBaseUrl, tenantId, KIND_TO_INVOICE[kind], referenceId),
          documentFilename: safeFilename(built.number),
          customerName: built.customerName,
          billNumber: built.number,
          total: displayAmount(built.total),
        });
        status = result.ok ? 'SENT' : 'FAILED';
        providerRef = result.providerRef;
        error = result.ok ? null : `MSG91: ${result.message}`;
      }
    } catch (cause) {
      status = 'FAILED';
      error = cause instanceof Error ? cause.message : String(cause);
    }

    const data = {
      phone,
      status,
      providerRef,
      error: error?.slice(0, 500) ?? null,
    };
    const row = await this.prisma.whatsappMessage.upsert({
      where: { tenantId_kind_referenceId: { tenantId, kind, referenceId } },
      create: { tenantId, kind, referenceId, ...data, attempts: 1 },
      update: { ...data, attempts: { increment: 1 } },
    });
    if (status !== 'SENT') {
      this.logger.warn(`WhatsApp ${kind} ${referenceId}: ${status} ${error ?? ''}`);
    }
    return {
      status: row.status,
      phone: row.phone,
      error: row.error,
      attempts: row.attempts,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
