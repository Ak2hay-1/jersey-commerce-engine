import { ConflictException } from '@nestjs/common';
import type { FulfillmentMethod, OrderStatus } from '@jersey-commerce/types';

const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY', 'CANCELLED'],
  READY: ['SHIPPED', 'COMPLETED', 'CANCELLED'],
  SHIPPED: ['COMPLETED', 'RETURNED'],
  COMPLETED: ['RETURNED', 'REFUNDED'],
  CANCELLED: [],
  RETURNED: ['REFUNDED'],
  REFUNDED: [],
};

export const CANCELLABLE_STATUSES: readonly OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'READY',
];

export function allowedOrderTransitions(from: OrderStatus): readonly OrderStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  return allowedOrderTransitions(from).includes(to);
}

export function assertOrderTransition(
  from: OrderStatus,
  to: OrderStatus,
  fulfillmentMethod: FulfillmentMethod = 'DELIVERY',
): void {
  if (from === to) {
    throw new ConflictException('Order is already in this status.');
  }
  if (!canTransitionOrderStatus(from, to)) {
    throw new ConflictException(`Cannot change order status from ${from} to ${to}.`);
  }
  if (to === 'SHIPPED' && fulfillmentMethod === 'STORE_PICKUP') {
    throw new ConflictException('Store pickup orders are collected at READY, not shipped.');
  }
  if (to === 'COMPLETED' && from === 'READY' && fulfillmentMethod === 'DELIVERY') {
    throw new ConflictException('Delivery orders must be shipped before they can be completed.');
  }
}

export function isCancellableStatus(status: OrderStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}
