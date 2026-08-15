import type { CustomerMetricsDto } from '@jersey-commerce/types';
import { DEFAULT_CRM_SETTINGS, resolveCrmSettings, type CrmSettings } from './crm-settings';

export const CRM_COUNTED_SALE_STATUSES = ['COMPLETED', 'PARTIALLY_REFUNDED'] as const;
export const CRM_EXCLUDED_SALE_STATUSES = ['CANCELLED', 'VOIDED', 'REFUNDED'] as const;
export const CRM_COUNTED_ORDER_STATUSES = ['COMPLETED'] as const;
export const CRM_EXCLUDED_ORDER_STATUSES = ['CANCELLED', 'RETURNED', 'REFUNDED'] as const;

export type CountedPurchase = {
  total: number;
  itemQuantity: number;
  createdAt: Date;
};

export function isCountedSaleStatus(status: string): boolean {
  return (CRM_COUNTED_SALE_STATUSES as readonly string[]).includes(status);
}

export function isCountedOrderStatus(status: string): boolean {
  return (CRM_COUNTED_ORDER_STATUSES as readonly string[]).includes(status);
}

export function moneyNumber(value: { toString(): string } | string | number | null | undefined): number {
  if (value == null) {
    return 0;
  }
  const parsed = Number(typeof value === 'number' ? value : value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function moneyString(value: number): string {
  return value.toFixed(2);
}

export function netPurchaseAmount(gross: number, refunded: number): number {
  return Math.max(0, roundMoney(gross) - roundMoney(refunded));
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computePurchaseMetrics(purchases: CountedPurchase[]): CustomerMetricsDto {
  const ordered = [...purchases].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const totalOrders = ordered.length;
  const totalSpent = roundMoney(ordered.reduce((sum, item) => sum + item.total, 0));
  const totalItemsPurchased = ordered.reduce((sum, item) => sum + item.itemQuantity, 0);
  return {
    totalOrders,
    totalSpent: moneyString(totalSpent),
    averageOrder: moneyString(totalOrders === 0 ? 0 : roundMoney(totalSpent / totalOrders)),
    totalItemsPurchased,
    firstPurchaseAt: ordered[0]?.createdAt.toISOString() ?? null,
    lastPurchaseAt: ordered[ordered.length - 1]?.createdAt.toISOString() ?? null,
  };
}

export function daysSince(from: Date, now: Date): number {
  return Math.floor((now.getTime() - from.getTime()) / 86_400_000);
}

export { DEFAULT_CRM_SETTINGS, resolveCrmSettings, type CrmSettings };
