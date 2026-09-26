import {
  BadRequestException,
  Injectable,
  Logger,
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
import { DelhiveryClient, type DelhiveryWarehouse } from './delhivery.client';
import { ShippingSettingsService } from './shipping-settings.service';
import { WarehousesService } from '../warehouses/warehouses.service';

const SHIPPABLE_STATUSES = new Set(['CONFIRMED', 'PROCESSING', 'READY']);

@Injectable()
export class ShipmentsService {
  private readonly logger = new Logger(ShipmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly delhivery: DelhiveryClient,
    private readonly shippingSettings: ShippingSettingsService,
    private readonly warehouses: WarehousesService,
    private readonly orders: OrderEngineService,
  ) {}

  /** Soft-fail auto create after payment / confirm — never throws to callers. */
  async tryAutoCreateForOrder(tenantId: string, orderId: string, meta?: RequestMeta): Promise<void> {
    try {
      await this.createForOrder(
        {
          userId: 'system',
          tenantId,
          email: 'system@jerzyfy.local',
          name: 'System',
          status: 'ACTIVE',
          mustChangePassword: false,
          roles: ['OWNER'],
          permissions: ['orders.update', 'orders.read'],
          tokenVersion: 0,
          tenantSlug: '',
          tenantName: '',
          tokenJti: 'system-auto-ship',
        },
        orderId,
        meta,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Auto Delhivery shipment skipped for order ${orderId}: ${message}`);
    }
  }

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
    if (!SHIPPABLE_STATUSES.has(order.status)) {
      throw new BadRequestException(
        'Order must be CONFIRMED, PROCESSING, or READY before creating a Delhivery shipment.',
      );
    }
    if (order.shipments.length > 0) {
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

    const variantIds = order.items.map((item) => item.productVariantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { tenantId: actor.tenantId, id: { in: variantIds } },
      select: {
        id: true,
        weight: true,
        product: { select: { id: true, name: true, warehouseId: true } },
      },
    });
    const variantById = new Map(variants.map((variant) => [variant.id, variant]));

    const groups = new Map<
      string,
      {
        warehouseKey: string;
        warehouseId: string | null;
        items: typeof order.items;
      }
    >();
    for (const item of order.items) {
      const variant = variantById.get(item.productVariantId);
      const warehouseId = variant?.product.warehouseId ?? null;
      const key = warehouseId ?? '__default__';
      const group = groups.get(key) ?? { warehouseKey: key, warehouseId, items: [] };
      group.items.push(item);
      groups.set(key, group);
    }

    const isCod = order.payments.some((payment) => payment.method === 'COD');
    const waybills: string[] = [];

    for (const group of groups.values()) {
      const warehouseRow = await this.warehouses.resolveForProduct(actor.tenantId, group.warehouseId);
      let warehouse: DelhiveryWarehouse;
      if (warehouseRow) {
        warehouse = this.warehouses.toDelhiveryWarehouse(warehouseRow);
      } else {
        warehouse = await this.shippingSettings.requireWarehouse(actor.tenantId);
      }

      const weight = await this.resolveWeightKgForItems(
        actor.tenantId,
        group.items,
        Number(settings?.defaultPackageWeightKg?.toString() ?? '0.5'),
        variantById,
      );
      const groupTotal = group.items.reduce((sum, item) => sum + Number(item.total.toString()), 0);
      const productsDescription = group.items
        .map((item) => `${item.productNameSnapshot} x${item.quantity}`)
        .join(', ')
        .slice(0, 200);

      const created = await this.delhivery.createShipment(credentials, {
        orderNumber: groups.size > 1 ? `${order.orderNumber}-${group.warehouseKey.slice(0, 6)}` : order.orderNumber,
        paymentMode: isCod ? 'COD' : 'Prepaid',
        codAmount: isCod ? groupTotal : 0,
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
        productsDescription,
        totalAmount: groupTotal,
      });

      await this.prisma.shipment.create({
        data: {
          tenantId: actor.tenantId,
          orderId: order.id,
          warehouseId: warehouseRow?.id ?? null,
          provider: 'DELHIVERY',
          waybill: created.waybill,
          trackingUrl: created.trackingUrl,
          labelUrl: created.labelUrl,
          packageWeightKg: new Prisma.Decimal(weight.toFixed(3)),
          codAmount: isCod ? new Prisma.Decimal(groupTotal.toFixed(2)) : null,
          providerStatus: created.providerStatus,
          providerRef: created.providerRef,
          lastPayload: created.raw as Prisma.InputJsonValue,
        },
      });
      if (created.waybill) {
        waybills.push(created.waybill);
      }
    }

    const updated = await this.orders.transitionStatus({
      tenantId: actor.tenantId,
      orderId: order.id,
      status: 'SHIPPED',
      actor: actor.userId === 'system' ? undefined : actor,
      meta,
    });

    await this.audit.log({
      action: AUDIT_ACTIONS.SHIPMENT_CREATED,
      tenantId: actor.tenantId,
      userId: actor.userId === 'system' ? undefined : actor.userId,
      entity: 'Shipment',
      entityId: order.id,
      metadata: { waybills, orderNumber: order.orderNumber, groups: groups.size },
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
    const shipment = order?.shipments[0];
    if (!order || !shipment?.waybill) {
      throw new NotFoundException('Shipment not found');
    }
    const credentials = await this.shippingSettings.resolveCredentials(actor.tenantId);
    if (!credentials) {
      throw new BadRequestException('Delhivery is not configured.');
    }
    for (const row of order.shipments) {
      if (!row.waybill) {
        continue;
      }
      const tracked = await this.delhivery.track(credentials, row.waybill);
      let labelUrl = row.labelUrl;
      try {
        labelUrl = await this.delhivery.fetchLabelUrl(credentials, row.waybill);
      } catch {
        /* keep existing */
      }
      await this.prisma.shipment.update({
        where: { id: row.id },
        data: {
          providerStatus: tracked.status ?? row.providerStatus,
          labelUrl,
          lastPayload: tracked.raw as Prisma.InputJsonValue,
        },
      });
      await this.maybeCompleteFromStatus(actor.tenantId, order.id, tracked.status);
    }
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

  private async resolveWeightKgForItems(
    _tenantId: string,
    items: Array<{ productVariantId: string; quantity: number }>,
    fallback: number,
    variantById: Map<string, { weight: Prisma.Decimal | null }>,
  ): Promise<number> {
    let total = 0;
    for (const item of items) {
      const weight = variantById.get(item.productVariantId)?.weight;
      const perUnit = weight ? Number(weight.toString()) : fallback;
      total += perUnit * item.quantity;
    }
    return Math.max(0.1, Number(total.toFixed(3)));
  }
}
