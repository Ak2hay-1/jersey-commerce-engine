import { describe, expect, it } from 'vitest';
import { resolveRouteParam } from './use-route-param';

describe('resolveRouteParam', () => {
  it('prefers a real param over pathname', () => {
    expect(resolveRouteParam('/categories/__id__', 'abc-123')).toBe('abc-123');
  });

  it('uses pathname when params are the static-export placeholder', () => {
    expect(resolveRouteParam('/categories/new', '__id__')).toBe('new');
    expect(resolveRouteParam('/products/new/', '[id]')).toBe('new');
  });

  it('falls back to the browser URL when Next pathname is also a placeholder', () => {
    expect(resolveRouteParam('/categories/__id__', '__id__', '/categories/new')).toBe('new');
    expect(resolveRouteParam('/products/[id]', '[id]', '/products/new/')).toBe('new');
  });
});
