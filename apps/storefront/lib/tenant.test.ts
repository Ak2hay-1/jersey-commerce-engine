import { describe, expect, it } from 'vitest';
import { tenantSlugFromHost } from './tenant';

describe('tenant resolution', () => {
  it('reads a slug from a platform subdomain', () => {
    expect(tenantSlugFromHost('demo-jersey-store.localhost')).toBe('demo-jersey-store');
  });

  it('ignores a bare localhost host', () => {
    expect(tenantSlugFromHost('localhost:3000')).toBeUndefined();
  });

  it('does not invent a tenant from an unmapped production host', () => {
    expect(tenantSlugFromHost('shop.example.com')).toBeUndefined();
  });
});
