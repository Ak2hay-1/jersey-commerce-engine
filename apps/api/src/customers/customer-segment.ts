import type { CustomerSegment } from '@jersey-commerce/types';
import { daysSince } from './customer-metrics';
import { resolveCrmSettings, type CrmSettings } from './crm-settings';

export interface SegmentInput {
  completedPurchaseCount: number;
  totalSpent: number;
  lastPurchaseAt: Date | null;
  createdAt: Date;
  now?: Date;
  settings?: Partial<CrmSettings>;
}

const PRIMARY_ORDER: CustomerSegment[] = ['HIGH_VALUE', 'INACTIVE', 'REPEAT', 'NEW'];

export function segmentsFor(input: SegmentInput): {
  segments: CustomerSegment[];
  primarySegment: CustomerSegment | null;
} {
  const settings = resolveCrmSettings(input.settings);
  const now = input.now ?? new Date();
  const segments: CustomerSegment[] = [];

  if (input.completedPurchaseCount === settings.newPurchaseCount) {
    segments.push('NEW');
  }
  if (input.completedPurchaseCount >= settings.repeatPurchaseCount) {
    segments.push('REPEAT');
  }
  if (input.totalSpent >= settings.highValueThreshold) {
    segments.push('HIGH_VALUE');
  }

  const inactivityAnchor = input.lastPurchaseAt ?? input.createdAt;
  if (daysSince(inactivityAnchor, now) >= settings.inactiveDays) {
    segments.push('INACTIVE');
  }

  const primarySegment = PRIMARY_ORDER.find((segment) => segments.includes(segment)) ?? null;
  return { segments, primarySegment };
}
