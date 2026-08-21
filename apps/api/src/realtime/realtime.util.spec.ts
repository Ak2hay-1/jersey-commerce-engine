import { shouldPublishRealtime, realtimeAffectsResource } from '@jersey-commerce/utils';

describe('realtime helpers', () => {
  it('skips auth and export actions', () => {
    expect(shouldPublishRealtime('auth.login.success', 't1')).toBe(false);
    expect(shouldPublishRealtime('reports.exported', 't1')).toBe(false);
    expect(shouldPublishRealtime('pos.sale.completed', 't1')).toBe(true);
    expect(shouldPublishRealtime('pos.sale.completed')).toBe(false);
  });

  it('matches list paths to audit entities', () => {
    expect(realtimeAffectsResource('/sales?page=1', 'Sale')).toBe(true);
    expect(realtimeAffectsResource('/pos/sales?page=1', 'Sale')).toBe(true);
    expect(realtimeAffectsResource('/products', 'Inventory')).toBe(true);
    expect(realtimeAffectsResource('/website', 'WebsiteSettings')).toBe(true);
    expect(realtimeAffectsResource('/users', 'Sale')).toBe(false);
  });
});
