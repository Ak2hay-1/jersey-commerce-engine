import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import type { AuthPrincipal } from '../common/context/request-context';
import type { RequestMeta } from '../auth/auth-session.service';
import { OrderEngineService } from '../orders/order-engine.service';
import { orderInclude, toOrderDetail, type OrderRecord } from '../orders/order.mapper';
import { DelhiveryClient } from './delhivery.client';
import { ShippingSettingsService } from './shipping-settings.service';

@Injectable()
export class ShipmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly delhivery: DelhiveryClient,
    private readonly shippingSettings: ShippingSettingsService,
    private readonly orders: OrderEngineService,
  ) {}

  async createForOrder(actor: AuthPrincipal, orderId: string, meta?: RequestMeta) {
    const order = await this.prisma.order.findFirst({
      where: { tenantId: actor.tenantId, OR: [{ id: orderId }, { orderNumber: orderId }] },
      include: { ...orderInclude, items: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.fulfillmentMethod !== 'DELIVERY') {
      throw new BadRequestException('Only delivery orders can be shipped with Delhivery.');
    }
    if (order.status !== 'READY') {
      throw new BadRequestException('Order must be READY before creating a Delhivery shipment.');
    }
    if (order.shipment) {
      throw new BadRequestException('A shipment already exists for this order.');
    }
    if (!order.shippingAddress) {
      throw new BadRequestException('Order has no shipping address.');
    }
    const credentials = await this.shippingSettings.resolveCredentials(actor.tenantId);
    if (!credentials) {
      throw new BadRequestException('Delhivery is not configured. Add credentials in Settings → Shipping.');
    }
    const settings = await this.shippingSettings.getRecord(actor.tenantId);
    const warehouse = await this.shippingSettings.requireWarehouse(actor.tenantId);
    const weight = await this.resolveWeightKg(actor.tenantId, order);
    const isCod = order.payments.some((payment) => payment.method === 'COD');
    const created = await this.delhivery.createShipment(credentials, {
      orderNumber: order.orderNumber,
      paymentMode: isCod ? 'COD' : 'Prepaid',
      codAmount: isCod ? Number(order.total.toString()) : 0,
      weightKg: weight,
      shippingMode: settings?.delhiveryServiceMode ?? 'SURFACE',
      warehouse,
      consignee: {
        name: order.shippingAddress.fullName,
        phone: order.shippingAddress.phone,
        address: [order.shippingAddress.addressLine1, order.shippingAddress.addressLine2]
          .filter(Boolean)
          .join(', '),
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        postalCode: order.shippingAddress.postalCode,
        country: order.shippingAddress.country || 'IN',
      },
      productsDescription: order.items.map((item) => `${item.productNameSnapshot} x${item.quantity}`).join(', ').slice(0, 200),
      totalAmount: Number(order.total.toString()),
    });

    await this.prisma.shipment.create({
      data: {
        tenantId: actor.tenantId,
        orderId: order.id,
        provider: 'DELHIVERY',
        waybill: created.waybill,
        trackingUrl: created.trackingUrl,
        labelUrl: created.labelUrl,
        packageWeightKg: new Prisma.Decimal(weight.toFixed(3)),
        codAmount: isCod ? order.total : null,
        providerStatus: created.providerStatus,
        providerRef: created.providerRef,
        lastPayload: created.raw as Prisma.InputJsonValue,
      },
    });

    const updated = await this.orders.transitionStatus({
      tenantId: actor.tenantId,
      orderId: order.id,
      status: 'SHIPPED',
      actor,
      meta,
    });

    await this.audit.log({
      action: AUDIT_ACTIONS.SHIPMENT_CREATED,
      tenantId: actor.tenantId,
      userId: actor.userId,
      entity: 'Shipment',
      entityId: order.id,
      metadata: { waybill: created.waybill, orderNumber: order.orderNumber },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return toOrderDetail(updated);
  }

  async refresh(actor: AuthPrincipal, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { tenantId: actor.tenantId, OR: [{ id: orderId }, { orderNumber: orderId }] },
      include: orderInclude,
    });
    if (!order?.shipment?.waybill) {
      throw new NotFoundException('Shipment not found');
    }
    const credentials = await this.shippingSettings.resolveCredentials(actor.tenantId);
    if (!credentials) {
      throw new BadRequestException('Delhivery is not configured.');
    }
    const tracked = await this.delhivery.track(credentials, order.shipment.waybill);
    let labelUrl = order.shipment.labelUrl;
    try {
      labelUrl = await this.delhivery.fetchLabelUrl(credentials, order.shipment.waybill);
    } catch {
      /* keep existing */
    }
    await this.prisma.shipment.update({
      where: { id: order.shipment.id },
      data: {
        providerStatus: tracked.status ?? order.shipment.providerStatus,
        labelUrl,
        lastPayload: tracked.raw as Prisma.InputJsonValue,
      },
    });
    await this.maybeCompleteFromStatus(actor.tenantId, order.id, tracked.status);
    const refreshed = await this.prisma.order.findFirst({
      where: { id: order.id, tenantId: actor.tenantId },
      include: orderInclude,
    });
    return toOrderDetail(refreshed as OrderRecord);
  }

  async handleWebhook(tenantId: string | undefined, secretHeader: string | undefined, body: Record<string, unknown>) {
    const waybill =
      (typeof body.waybill === 'string' && body.waybill) ||
      (typeof body.Shipment === 'object' &&
        body.Shipment &&
        typeof (body.Shipment as { AWB?: string }).AWB === 'string' &&
        (body.Shipment as { AWB: string }).AWB) ||
      null;
    const status =
      (typeof body.status === 'string' && body.status) ||
      (typeof body.Shipment === 'object' &&
        body.Shipment &&
        typeof (body.Shipment as { Status?: { Status?: string } }).Status?.Status === 'string' &&
        (body.Shipment as { Status: { Status: string } }).Status.Status) ||
      null;

    if (!waybill) {
      throw new BadRequestException('Webhook payload missing waybill.');
    }

    const shipment = await this.prisma.shipment.findFirst({
      where: tenantId ? { tenantId, waybill } : { waybill },
      include: { order: true },
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    const expected = await this.shippingSettings.resolveWebhookSecret(shipment.tenantId);
    if (expected && expected !== secretHeader) {
      throw new UnauthorizedException('Invalid Delhivery webhook secret.');
    }

    await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        providerStatus: status ?? shipment.providerStatus,
        lastPayload: body as Prisma.InputJsonValue,
      },
    });

    await this.maybeCompleteFromStatus(shipment.tenantId, shipment.orderId, status);
    return { ok: true };
  }

  private async maybeCompleteFromStatus(tenantId: string, orderId: string, status: string | null) {
    if (!status) {
      return;
    }
    const normalized = status.toLowerCase();
    const delivered = normalized.includes('deliver') && !normalized.includes('undeliver');
    if (!delivered) {
      return;
    }
    const order = await this.prisma.order.findFirst({ where: { id: orderId, tenantId } });
    if (!order || order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      return;
    }
    if (order.status === 'SHIPPED') {
      await this.orders.transitionStatus({
        tenantId,
        orderId,
        status: 'COMPLETED',
      });
      const codPayment = await this.prisma.payment.findFirst({
        where: { tenantId, orderId, method: 'COD', status: 'PENDING' },
      });
      if (codPayment) {
        await this.prisma.payment.update({
          where: { id: codPayment.id },
          data: { status: 'COMPLETED' },
        });
        await this.prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'COMPLETED' },
        });
      }
    }
  }

  private async resolveWeightKg(
    tenantId: string,
    order: { items: Array<{ productVariantId: string; quantity: number }> },
  ): Promise<number> {
    const settings = await this.shippingSettings.getRecord(tenantId);
    const fallback = Number(settings?.defaultPackageWeightKg?.toString() ?? '0.5');
    const variants = await this.prisma.productVariant.findMany({
      where: { tenantId, id: { in: order.items.map((item) => item.productVariantId) } },
      select: { id: true, weight: true },
    });
    const byId = new Map(variants.map((variant) => [variant.id, variant.weight]));
    let total = 0;
    for (const item of order.items) {
      const weight = byId.get(item.productVariantId);
      const perUnit = weight ? Number(weight.toString()) : fallback;
      total += perUnit * item.quantity;
    }
    return Math.max(0.1, Number(total.toFixed(3)));
  }
}
