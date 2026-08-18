import { DEFAULT_CRM_SETTINGS } from './crm-settings';
import { segmentsFor } from './customer-segment';

describe('customer-segment', () => {
  const createdAt = new Date('2026-01-01T00:00:00Z');
  const now = new Date('2026-08-15T00:00:00Z');

  it('marks a single completed purchase as NEW', () => {
    const result = segmentsFor({
      completedPurchaseCount: 1,
      totalSpent: 999,
      lastPurchaseAt: new Date('2026-08-01T00:00:00Z'),
      createdAt,
      now,
    });
    expect(result.segments).toEqual(['NEW']);
    expect(result.primarySegment).toBe('NEW');
  });

  it('marks two or more completed purchases as REPEAT', () => {
    const result = segmentsFor({
      completedPurchaseCount: 2,
      totalSpent: 2000,
      lastPurchaseAt: new Date('2026-08-01T00:00:00Z'),
      createdAt,
      now,
    });
    expect(result.segments).toEqual(['REPEAT']);
    expect(result.primarySegment).toBe('REPEAT');
  });

  it('marks high-value customers from the configurable threshold', () => {
    const result = segmentsFor({
      completedPurchaseCount: 3,
      totalSpent: DEFAULT_CRM_SETTINGS.highValueThreshold,
      lastPurchaseAt: new Date('2026-08-01T00:00:00Z'),
      createdAt,
      now,
    });
    expect(result.segments).toEqual(['REPEAT', 'HIGH_VALUE']);
    expect(result.primarySegment).toBe('HIGH_VALUE');
  });

  it('marks inactive customers using the configurable day window', () => {
    const result = segmentsFor({
      completedPurchaseCount: 2,
      totalSpent: 2000,
      lastPurchaseAt: new Date('2026-01-01T00:00:00Z'),
      createdAt,
      now,
      settings: { inactiveDays: 90 },
    });
    expect(result.segments).toContain('INACTIVE');
    expect(result.segments).toContain('REPEAT');
    expect(result.primarySegment).toBe('INACTIVE');
  });

  it('does not treat a recent customer with no purchases as inactive', () => {
    const result = segmentsFor({
      completedPurchaseCount: 0,
      totalSpent: 0,
      lastPurchaseAt: null,
      createdAt: new Date('2026-08-10T00:00:00Z'),
      now,
    });
    expect(result.segments).toEqual([]);
    expect(result.primarySegment).toBeNull();
  });

  it('uses createdAt as the inactivity anchor when there are no purchases', () => {
    const result = segmentsFor({
      completedPurchaseCount: 0,
      totalSpent: 0,
      lastPurchaseAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      now,
      settings: { inactiveDays: 90 },
    });
    expect(result.segments).toEqual(['INACTIVE']);
  });
});
