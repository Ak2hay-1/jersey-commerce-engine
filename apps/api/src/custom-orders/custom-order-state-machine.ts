import { ConflictException } from '@nestjs/common';
import type { CustomOrderProductionStatus, CustomOrderStatus } from '@jersey-commerce/types';

const TRANSITIONS: Record<CustomOrderStatus, readonly CustomOrderStatus[]> = {
  INQUIRY: ['QUOTATION', 'CANCELLED'],
  QUOTATION: ['QUOTE_SENT', 'DEPOSIT_PENDING', 'CONFIRMED', 'CANCELLED'],
  QUOTE_SENT: ['CUSTOMER_APPROVAL', 'QUOTATION', 'DEPOSIT_PENDING', 'CONFIRMED', 'CANCELLED'],
  CUSTOMER_APPROVAL: ['DEPOSIT_PENDING', 'CONFIRMED', 'QUOTATION', 'CANCELLED'],
  DEPOSIT_PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['DESIGN_PENDING', 'DESIGN_APPROVAL', 'PRODUCTION', 'CANCELLED'],
  DESIGN_PENDING: ['DESIGN_APPROVAL', 'PRODUCTION', 'CANCELLED'],
  DESIGN_APPROVAL: ['PRODUCTION', 'DESIGN_PENDING', 'CANCELLED'],
  PRODUCTION: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const PRODUCTION_TRANSITIONS: Record<CustomOrderProductionStatus, readonly CustomOrderProductionStatus[]> = {
  DESIGN_PENDING: ['DESIGN_APPROVAL'],
  DESIGN_APPROVAL: ['MATERIAL_PENDING', 'DESIGN_PENDING'],
  MATERIAL_PENDING: ['PRODUCTION'],
  PRODUCTION: ['QUALITY_CHECK'],
  QUALITY_CHECK: ['READY', 'PRODUCTION'],
  READY: [],
};

export const CANCELLABLE_CUSTOM_ORDER_STATUSES: readonly CustomOrderStatus[] = [
  'INQUIRY',
  'QUOTATION',
  'QUOTE_SENT',
  'CUSTOMER_APPROVAL',
  'DEPOSIT_PENDING',
  'CONFIRMED',
  'DESIGN_PENDING',
  'DESIGN_APPROVAL',
  'PRODUCTION',
  'READY',
];

export function allowedCustomOrderTransitions(from: CustomOrderStatus): readonly CustomOrderStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function canTransitionCustomOrderStatus(from: CustomOrderStatus, to: CustomOrderStatus): boolean {
  return allowedCustomOrderTransitions(from).includes(to);
}

export function assertCustomOrderTransition(from: CustomOrderStatus, to: CustomOrderStatus): void {
  if (from === to) {
    throw new ConflictException('Custom order is already in this status.');
  }
  if (!canTransitionCustomOrderStatus(from, to)) {
    throw new ConflictException(`Cannot change custom order status from ${from} to ${to}.`);
  }
}

export function isCancellableCustomOrderStatus(status: CustomOrderStatus): boolean {
  return CANCELLABLE_CUSTOM_ORDER_STATUSES.includes(status);
}

export function canTransitionProductionStatus(
  from: CustomOrderProductionStatus,
  to: CustomOrderProductionStatus,
): boolean {
  return (PRODUCTION_TRANSITIONS[from] ?? []).includes(to);
}

export function assertProductionTransition(
  from: CustomOrderProductionStatus | null,
  to: CustomOrderProductionStatus,
): void {
  if (from === to) {
    throw new ConflictException('Production is already in this status.');
  }
  if (!from) {
    const allowed: CustomOrderProductionStatus[] = ['DESIGN_PENDING', 'DESIGN_APPROVAL', 'MATERIAL_PENDING', 'PRODUCTION'];
    if (!allowed.includes(to)) {
      throw new ConflictException(`Cannot start production at ${to}.`);
    }
    return;
  }
  if (!canTransitionProductionStatus(from, to)) {
    throw new ConflictException(`Cannot change production status from ${from} to ${to}.`);
  }
}
