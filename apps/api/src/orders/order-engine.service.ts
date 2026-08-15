import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CatalogStatus, Prisma, VariantStatus } from '../prisma/client';
import type { DiscountType, FulfillmentMethod, OrderSource } from '@jersey-commerce/types';
import { PrismaService } from '../prisma/prisma.service';
import { asTx } from '../prisma/as-tx';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import { DOCUMENT_TYPES, nextDocumentNumber } from '../documents/document-sequence';
import { InventoryService, type InventoryActor } from '../inventory/inventory.service';
import { money } from '../pos/pos-money';
import { parseTaxRate } from '../finance/tax';
import { priceOrderLines, type PricedOrderLineInput } from './order-pricing';
import { ShippingCalculator } from './shipping.calculator';
import { UnconfiguredOnlineGateway } from './unconfigured-online.gateway';
import { OrderSaleRecognitionService } from './order-sale.service';
import { assertOrderTransition, isCancellableStatus } from './order-state-machine';
import { orderInclude, toOrderDetail, type OrderRecord } from './order.mapper';
import type { OrderShippingAddressDto } from './dto/order.dto';
import type { AuthPrincipal } from '../common/context/request-context';
import type { RequestMeta } from '../auth/auth-session.service';

const TX_OPTIONS = {
  maxWait: 5_000,
  timeout: 20_000,
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
} as const;

export interface OrderLineRequest {
  productVariantId: string;
  quantity: number;
}

export interface CreateOrderEngineInput {
  tenantId: string;
  source: OrderSource;
  customerId: string;
  createdById?: string | null;
  fulfillmentMethod: FulfillmentMethod;
  notes?: string | null;
  discountType?: DiscountType;
  discountValue?: Prisma.Decimal;
  shippingAddress?: OrderShippingAddressDto;
  items: OrderLineRequest[];
  actor?: InventoryActor;
  meta?: RequestMeta;
}

@Injectable()
export class OrderEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly inventory: InventoryService,
    private readonly shipping: ShippingCalculator,
    private readonly gateway: UnconfiguredOnlineGateway,
    private readonly saleRecognition: OrderSaleRecognitionService,
  ) {}

  async createOrder(input: CreateOrderEngineInput, tx: object): Promise<OrderRecord> {
    const client = asTx(tx);
    if (input.items.length === 0) {
      throw new BadRequestException('An order must contain at least one item.');
    }
    const tenant = await client.tenant.findFirst({ where: { id: input.tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    this.assertFulfillment(input.fulfillmentMethod, input.shippingAddress);
    const pricedInputs = await this.loadPricedLines(client, input.tenantId, tenant, input.items);
    const discountType = input.discountType ?? 'NONE';
    const discountValue = input.discountValue ?? money(0);
    const provisional = priceOrderLines(pricedInputs, discountType, discountValue, money(0));
    const shippingQuote = this.shipping.quote(input.fulfillmentMethod, provisional.total, {
      shippingCalculationMode: tenant.shippingCalculationMode,
      shippingFixedAmount: tenant.shippingFixedAmount,
      freeShippingMinSubtotal: tenant.freeShippingMinSubtotal,
    });
    const priced = priceOrderLines(pricedInputs, discountType, discountValue, shippingQuote.amount);
    const orderNumber = await nextDocumentNumber(client, input.tenantId, DOCUMENT_TYPES.ORDER);
    const created = await client.order.create({
      data: {
        tenantId: input.tenantId,
        orderNumber,
        customerId: input.customerId,
        createdById: input.createdById ?? null,
        source: input.source,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        fulfillmentMethod: input.fulfillmentMethod,
        inventoryState: 'NONE',
        subtotal: priced.subtotal,
        discountType,
        discountValue,
        discount: priced.discount,
        tax: priced.tax,
        shippingAmount: priced.shippingAmount,
        total: priced.total,
        currency: tenant.currency,
        notes: input.notes?.trim() || null,
      },
    });
    for (const line of priced.lines) {
      await client.orderItem.create({
        data: {
          tenantId: input.tenantId,
          orderId: created.id,
          productVariantId: line.productVariantId,
          productNameSnapshot: line.productName,
          skuSnapshot: line.sku,
          sizeSnapshot: line.size,
          colorSnapshot: line.color,
          variantSnapshot: { size: line.size, color: line.color, sku: line.sku },
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          costPrice: line.costPrice,
          discountType: 'NONE',
          discountValue: money(0),
          discount: line.discount,
          taxRate: line.taxRate,
          taxInclusive: line.taxInclusive,
          tax: line.tax,
          total: line.total,
        },
      });
    }
    if (input.fulfillmentMethod === 'DELIVERY' && input.shippingAddress) {
      await client.orderShippingAddress.create({
        data: {
          tenantId: input.tenantId,
          orderId: created.id,
          fullName: input.shippingAddress.fullName.trim(),
          phone: input.shippingAddress.phone.trim(),
          addressLine1: input.shippingAddress.addressLine1.trim(),
          addressLine2: input.shippingAddress.addressLine2?.trim() || null,
          city: input.shippingAddress.city.trim(),
          state: input.shippingAddress.state.trim(),
          postalCode: input.shippingAddress.postalCode.trim(),
          country: (input.shippingAddress.country ?? tenant.country ?? 'IN').trim().toUpperCase(),
        },
      });
    }
    await this.reserveLines(input, created.id, orderNumber, priced.lines, tx);
    await client.order.update({
      where: { id: created.id },
      data: { inventoryState: 'RESERVED' },
    });
    await this.gateway.createPaymentIntent(
      {
        tenantId: input.tenantId,
        orderId: created.id,
        amount: priced.total,
        currency: tenant.currency,
        customerId: input.customerId,
        createdById: input.createdById ?? null,
        metadata: { orderNumber, source: input.source },
      },
      tx,
    );
    await this.audit.log(
      {
        action: AUDIT_ACTIONS.ORDER_CREATED,
        tenantId: input.tenantId,
        userId: input.createdById ?? input.actor?.userId,
        entity: 'Order',
        entityId: created.id,
        metadata: {
          orderNumber,
          source: input.source,
          total: priced.total.toFixed(2),
          currency: tenant.currency,
          itemCount: priced.lines.length,
        },
        ipAddress: input.meta?.ipAddress ?? input.actor?.ipAddress,
        userAgent: input.meta?.userAgent ?? input.actor?.userAgent,
      },
      tx,
    );
    await this.audit.log(
      {
        action: AUDIT_ACTIONS.ORDER_STOCK_RESERVED,
        tenantId: input.tenantId,
        userId: input.createdById ?? input.actor?.userId,
        entity: 'Order',
        entityId: created.id,
        metadata: { orderNumber, lines: priced.lines.map((line) => ({ sku: line.sku, quantity: line.quantity })) },
      },
      tx,
    );
    const record = await client.order.findFirst({
      where: { id: created.id, tenantId: input.tenantId },
      include: orderInclude,
    });
    if (!record) {
      throw new ConflictException('Order could not be loaded after creation.');
    }
    return record;
  }

  async cancelOrder(input: {
    tenantId: string;
    orderId: string;
    reason: string;
    actor?: AuthPrincipal;
    meta?: RequestMeta;
    allowPaid?: boolean;
  }): Promise<OrderRecord> {
    const reason = input.reason.trim();
    if (!reason) {
      throw new BadRequestException('A cancellation reason is required.');
    }
    return this.prisma.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, input.tenantId, input.orderId);
      if (!isCancellableStatus(order.status)) {
        throw new ConflictException('This order can no longer be cancelled.');
      }
      if (order.paymentStatus === 'COMPLETED' && !input.allowPaid) {
        throw new ConflictException('Paid orders cannot be cancelled from the storefront. Contact the store for a refund.');
      }
      if (order.inventoryState === 'RESERVED') {
        for (const item of order.items) {
          await this.inventory.releaseStock(
            input.tenantId,
            item.productVariantId,
            {
              quantity: item.quantity,
              reason,
              referenceType: 'ORDER',
              referenceId: order.id,
            },
            { userId: input.actor?.userId, ipAddress: input.meta?.ipAddress, userAgent: input.meta?.userAgent },
            input.meta,
            tx,
          );
        }
      }
      await tx.payment.updateMany({
        where: { tenantId: input.tenantId, orderId: order.id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      const nextPaymentStatus = order.paymentStatus === 'PENDING' ? 'CANCELLED' : order.paymentStatus;
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          paymentStatus: nextPaymentStatus,
          inventoryState: order.inventoryState === 'RESERVED' ? 'RELEASED' : order.inventoryState,
          cancelReason: reason,
          cancelledAt: new Date(),
          cancelledById: input.actor?.userId ?? null,
        },
      });
      await this.audit.log(
        {
          action: AUDIT_ACTIONS.ORDER_CANCELLED,
          tenantId: input.tenantId,
          userId: input.actor?.userId,
          entity: 'Order',
          entityId: order.id,
          oldValue: { status: order.status, paymentStatus: order.paymentStatus },
          newValue: { status: 'CANCELLED', reason },
        },
        tx,
      );
      if (order.inventoryState === 'RESERVED') {
        await this.audit.log(
          {
            action: AUDIT_ACTIONS.ORDER_STOCK_RELEASED,
            tenantId: input.tenantId,
            userId: input.actor?.userId,
            entity: 'Order',
            entityId: order.id,
            metadata: { orderNumber: order.orderNumber },
          },
          tx,
        );
      }
      return this.reload(tx, input.tenantId, order.id);
    }, TX_OPTIONS);
  }

  async transitionStatus(input: {
    tenantId: string;
    orderId: string;
    status: OrderRecord['status'];
    actor: AuthPrincipal;
    meta?: RequestMeta;
  }): Promise<OrderRecord> {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.lockOrder(tx, input.tenantId, input.orderId);
      assertOrderTransition(order.status, input.status, order.fulfillmentMethod);
      const now = new Date();
      const data: Prisma.OrderUpdateInput = { status: input.status };
      if (input.status === 'CONFIRMED') {
        data.confirmedAt = now;
      }
      if (input.status === 'SHIPPED') {
        data.shippedAt = now;
      }
      if (input.status === 'COMPLETED') {
        data.completedAt = now;
        if (order.inventoryState === 'RESERVED') {
          await this.saleRecognition.consumeReservedForOrder(tx, {
            tenantId: input.tenantId,
            orderId: order.id,
            orderNumber: order.orderNumber,
            items: order.items.map((item) => ({ productVariantId: item.productVariantId, quantity: item.quantity })),
            actor: { userId: input.actor.userId, ipAddress: input.meta?.ipAddress, userAgent: input.meta?.userAgent },
          });
          data.inventoryState = 'CONSUMED';
          await this.audit.log(
            {
              action: AUDIT_ACTIONS.ORDER_STOCK_CONSUMED,
              tenantId: input.tenantId,
              userId: input.actor.userId,
              entity: 'Order',
              entityId: order.id,
              metadata: { orderNumber: order.orderNumber },
            },
            tx,
          );
        }
      }
      await tx.order.update({ where: { id: order.id }, data });
      await this.audit.log(
        {
          action: input.status === 'CONFIRMED' ? AUDIT_ACTIONS.ORDER_CONFIRMED : AUDIT_ACTIONS.ORDER_STATUS_CHANGED,
          tenantId: input.tenantId,
          userId: input.actor.userId,
          entity: 'Order',
          entityId: order.id,
          oldValue: { status: order.status },
          newValue: { status: input.status },
        },
        tx,
      );
      return this.reload(tx, input.tenantId, order.id);
    }, TX_OPTIONS);
  }

  toDetail(order: OrderRecord) {
    return toOrderDetail(order);
  }

  private async reserveLines(
    input: CreateOrderEngineInput,
    orderId: string,
    orderNumber: string,
    lines: Array<{ productVariantId: string; quantity: number }>,
    tx: object,
  ) {
    const actor: InventoryActor = {
      userId: input.createdById ?? input.actor?.userId,
      ipAddress: input.meta?.ipAddress ?? input.actor?.ipAddress,
      userAgent: input.meta?.userAgent ?? input.actor?.userAgent,
    };
    for (const line of lines) {
      await this.inventory.reserveStock(
        input.tenantId,
        line.productVariantId,
        {
          quantity: line.quantity,
          reason: `Hold for order ${orderNumber}`,
          referenceType: 'ORDER',
          referenceId: orderId,
        },
        actor,
        input.meta,
        tx,
      );
    }
  }

  private async loadPricedLines(
    client: Prisma.TransactionClient,
    tenantId: string,
    tenant: { defaultTaxRate: Prisma.Decimal; taxInclusivePricing: boolean },
    items: OrderLineRequest[],
  ): Promise<PricedOrderLineInput[]> {
    const merged = new Map<string, number>();
    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new BadRequestException('Item quantity must be a positive integer.');
      }
      merged.set(item.productVariantId, (merged.get(item.productVariantId) ?? 0) + item.quantity);
    }
    const lines: PricedOrderLineInput[] = [];
    for (const [productVariantId, quantity] of merged.entries()) {
      const variant = await client.productVariant.findFirst({
        where: { id: productVariantId, tenantId },
        include: { product: true },
      });
      if (!variant || variant.product.tenantId !== tenantId) {
        throw new NotFoundException('Product variant not found');
      }
      if (variant.product.status !== CatalogStatus.ACTIVE) {
        throw new BadRequestException('Product is not active.');
      }
      if (variant.status !== VariantStatus.ACTIVE) {
        throw new BadRequestException('Product variant is not active.');
      }
      const unitPrice = money(variant.sellingPrice.toString());
      if (unitPrice.lte(0)) {
        throw new BadRequestException('Selling price is not valid.');
      }
      const taxInclusive = variant.taxInclusive ?? tenant.taxInclusivePricing;
      const taxRate = parseTaxRate(variant.taxRate ?? tenant.defaultTaxRate);
      lines.push({
        productVariantId: variant.id,
        productName: variant.product.name,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        quantity,
        unitPrice,
        costPrice: money(variant.costPrice.toString()),
        taxRate,
        taxInclusive,
      });
    }
    return lines;
  }

  private assertFulfillment(method: FulfillmentMethod, address?: OrderShippingAddressDto) {
    if (method === 'DELIVERY') {
      if (!address) {
        throw new BadRequestException('A shipping address is required for delivery orders.');
      }
      return;
    }
    if (address) {
      throw new BadRequestException('Store pickup orders do not use a shipping address.');
    }
  }

  private async lockOrder(tx: object, tenantId: string, orderId: string) {
    const client = asTx(tx);
    const rows = await client.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM orders WHERE id = ${orderId} AND tenant_id = ${tenantId} FOR UPDATE
    `;
    if (!rows[0]) {
      throw new NotFoundException('Order not found');
    }
    const order = await client.order.findFirst({
      where: { id: orderId, tenantId },
      include: orderInclude,
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  private async reload(tx: object, tenantId: string, id: string): Promise<OrderRecord> {
    const order = await asTx(tx).order.findFirst({ where: { id, tenantId }, include: orderInclude });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }
}
