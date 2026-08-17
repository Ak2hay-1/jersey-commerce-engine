import type {
  OrderDetail,
  OrderItemDto,
  OrderPaymentDto,
  OrderPaymentState,
  OrderShippingAddressDto,
  OrderSummary,
  OrderTrackingStep,
} from '@jersey-commerce/types';
import type { FulfillmentMethod, PaymentStatus } from '@jersey-commerce/types';
import { Prisma } from '../prisma/client';
import { moneyString } from '../pos/pos-money';
import { buildOrderTracking } from './order-tracking';

export const orderInclude = {
  customer: { select: { id: true, name: true, phone: true, email: true } },
  items: { orderBy: { id: 'asc' as const } },
  payments: { orderBy: { createdAt: 'asc' as const } },
  shippingAddress: true,
} satisfies Prisma.OrderInclude;

export type OrderRecord = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export function toPaymentState(status: PaymentStatus): OrderPaymentState {
  return `PAYMENT_${status}` as OrderPaymentState;
}

function toShippingAddress(
  address: OrderRecord['shippingAddress'],
): OrderShippingAddressDto | null {
  if (!address) {
    return null;
  }
  return {
    fullName: address.fullName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
  };
}

function toItem(item: OrderRecord['items'][number]): OrderItemDto {
  return {
    id: item.id,
    productVariantId: item.productVariantId,
    productName: item.productNameSnapshot,
    sku: item.skuSnapshot,
    size: item.sizeSnapshot,
    color: item.colorSnapshot,
    quantity: item.quantity,
    unitPrice: moneyString(item.unitPrice),
    discount: moneyString(item.discount),
    tax: moneyString(item.tax),
    total: moneyString(item.total),
  };
}

function toPayment(payment: OrderRecord['payments'][number]): OrderPaymentDto {
  return {
    id: payment.id,
    amount: moneyString(payment.amount),
    method: payment.method,
    status: payment.status,
    paymentState: toPaymentState(payment.status),
    provider: payment.provider,
    reference: payment.reference,
    createdAt: payment.createdAt.toISOString(),
  };
}

export function toOrderSummary(order: OrderRecord): OrderSummary {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    source: order.source,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentState: toPaymentState(order.paymentStatus),
    fulfillmentMethod: order.fulfillmentMethod,
    inventoryState: order.inventoryState,
    subtotal: moneyString(order.subtotal),
    discount: moneyString(order.discount),
    tax: moneyString(order.tax),
    shippingAmount: moneyString(order.shippingAmount),
    total: moneyString(order.total),
    currency: order.currency,
    customerId: order.customerId,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export function toOrderTracking(order: OrderRecord): OrderTrackingStep[] {
  return buildOrderTracking({
    status: order.status,
    paymentCompleted: order.paymentStatus === 'COMPLETED' || order.paymentStatus === 'REFUNDED' || order.paymentStatus === 'PARTIALLY_REFUNDED',
    fulfillmentMethod: order.fulfillmentMethod as FulfillmentMethod,
  });
}

export function toOrderDetail(order: OrderRecord, paymentIntent?: OrderDetail['paymentIntent']): OrderDetail {
  const payments = order.payments.map(toPayment);
  const latest = [...order.payments].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  return {
    ...toOrderSummary(order),
    notes: order.notes,
    cancelReason: order.cancelReason,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    confirmedAt: order.confirmedAt?.toISOString() ?? null,
    shippedAt: order.shippedAt?.toISOString() ?? null,
    completedAt: order.completedAt?.toISOString() ?? null,
    customer: order.customer,
    shippingAddress: toShippingAddress(order.shippingAddress),
    items: order.items.map(toItem),
    payments,
    tracking: toOrderTracking(order),
    paymentIntent:
      paymentIntent ??
      (latest
        ? {
            paymentId: latest.id,
            status: latest.status,
            paymentState: toPaymentState(latest.status),
            amount: moneyString(latest.amount),
            currency: order.currency,
            provider: latest.provider,
            nextAction: latest.status === 'PENDING' ? 'AWAIT_GATEWAY' : 'NONE',
          }
        : undefined),
  };
}
