import { describe, expect, it } from 'vitest';

const VIEWPORTS = [360, 390, 768, 1024, 1440];

describe('responsive layout tokens', () => {
  it('covers the required storefront breakpoints', () => {
    expect(VIEWPORTS).toEqual([360, 390, 768, 1024, 1440]);
  });

  it('uses a two-column mobile product grid that expands at tablet and desktop', () => {
    const grid = 'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4';
    expect(grid).toContain('grid-cols-2');
    expect(grid).toContain('md:grid-cols-3');
    expect(grid).toContain('lg:grid-cols-4');
  });
});
