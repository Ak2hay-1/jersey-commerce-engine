import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CustomOrderStatus, OrderStatus } from '@jersey-commerce/types';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import type { RequestMeta } from '../auth/auth-session.service';

const OPEN_ORDER_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'SHIPPED'];
const CLOSED_CUSTOM_ORDER_STATUSES: CustomOrderStatus[] = ['COMPLETED', 'CANCELLED'];

export const ERASED_CUSTOMER_NAME = 'Deleted customer';

@Injectable()
export class StorePrivacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async exportData(tenantId: string, customerId: string, meta?: RequestMeta) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        postalCode: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        preference: { select: { emailOptIn: true, smsOptIn: true, whatsappOptIn: true, updatedAt: true } },
        identities: { select: { provider: true, email: true, createdAt: true } },
      },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }

    const [orders, customOrders] = await Promise.all([
      this.prisma.order.findMany({
        where: { tenantId, customerId },
        orderBy: { createdAt: 'desc' },
        select: {
          orderNumber: true,
          status: true,
          paymentStatus: true,
          fulfillmentMethod: true,
          subtotal: true,
          discount: true,
          tax: true,
          shippingAmount: true,
          total: true,
          currency: true,
          notes: true,
          createdAt: true,
          items: {
            select: {
              productNameSnapshot: true,
              skuSnapshot: true,
              sizeSnapshot: true,
              colorSnapshot: true,
              quantity: true,
              unitPrice: true,
              total: true,
            },
          },
          shippingAddress: {
            select: {
              fullName: true,
              phone: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              state: true,
              postalCode: true,
              country: true,
            },
          },
          payments: { select: { amount: true, method: true, status: true, provider: true, createdAt: true } },
        },
      }),
      this.prisma.customOrder.findMany({
        where: { tenantId, customerId },
        orderBy: { createdAt: 'desc' },
        select: {
          orderNumber: true,
          status: true,
          type: true,
          paymentStatus: true,
          description: true,
          teamName: true,
          preferredJerseyType: true,
          preferredColours: true,
          customizationRequirements: true,
          estimatedQuantity: true,
          requestedDeliveryDate: true,
          total: true,
          depositPaid: true,
          balanceDue: true,
          createdAt: true,
        },
      }),
    ]);

    await this.audit.log({
      action: AUDIT_ACTIONS.CUSTOMER_DATA_EXPORTED,
      tenantId,
      entity: 'Customer',
      entityId: customerId,
      metadata: { orders: orders.length, customOrders: customOrders.length },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      exportedAt: new Date().toISOString(),
      profile: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        postalCode: customer.postalCode,
        status: customer.status,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      },
      preferences: customer.preference,
      linkedSignIns: customer.identities,
      orders,
      customOrders,
    };
  }

  /**
   * Anonymises the customer record. Orders, invoices and payments are retained because
   * tax and accounting law requires it; their shipping snapshots are not altered.
   */
  async erase(tenantId: string, customerId: string, meta?: RequestMeta) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { id: true },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }

    const [openOrders, openCustomOrders] = await Promise.all([
      this.prisma.order.count({ where: { tenantId, customerId, status: { in: OPEN_ORDER_STATUSES } } }),
      this.prisma.customOrder.count({
        where: { tenantId, customerId, status: { notIn: CLOSED_CUSTOM_ORDER_STATUSES } },
      }),
    ]);
    if (openOrders > 0 || openCustomOrders > 0) {
      throw new ConflictException(
        'You have orders in progress. Your account can be deleted once they are completed or cancelled.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.customerIdentity.deleteMany({ where: { tenantId, customerId } }),
      this.prisma.customerPreference.updateMany({
        where: { tenantId, customerId },
        data: { emailOptIn: false, smsOptIn: false, whatsappOptIn: false },
      }),
      this.prisma.customerNote.deleteMany({ where: { tenantId, customerId } }),
      this.prisma.customerTag.deleteMany({ where: { tenantId, customerId } }),
      this.prisma.cart.updateMany({
        where: { tenantId, customerId, status: 'ACTIVE' },
        data: { status: 'ABANDONED', customerId: null },
      }),
      this.prisma.customer.updateMany({
        where: { id: customerId, tenantId },
        data: {
          name: ERASED_CUSTOMER_NAME,
          email: null,
          phone: null,
          address: null,
          city: null,
          state: null,
          postalCode: null,
          notes: null,
          passwordHash: null,
          status: 'INACTIVE',
        },
      }),
    ]);

    await this.audit.log({
      action: AUDIT_ACTIONS.CUSTOMER_ERASED,
      tenantId,
      entity: 'Customer',
      entityId: customerId,
      metadata: { source: 'storefront-self-service' },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return { erased: true };
  }
}
