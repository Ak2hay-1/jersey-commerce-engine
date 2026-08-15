import { describe, expect, it } from 'vitest';
import { catalogHref, catalogQueryString } from './catalog-query';

describe('catalog query', () => {
  it('keeps backend filter params instead of downloading the catalog', () => {
    expect(catalogQueryString({ search: 'india', size: 'M', colour: 'Red', sort: 'price-asc' })).toBe(
      '?search=india&size=M&colour=Red&sort=price-asc',
    );
  });

  it('omits page 1 and preserves filters on later pages', () => {
    expect(catalogHref('/products', { search: 'kit', sort: 'newest' }, 1)).toBe('/products?search=kit&sort=newest');
    expect(catalogHref('/category/football', { size: 'L' }, 3)).toBe('/category/football?size=L&page=3');
  });
});
