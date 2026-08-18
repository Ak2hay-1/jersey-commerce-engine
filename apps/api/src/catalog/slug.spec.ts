import { slugify, isUrlSafeSlug } from '@jersey-commerce/utils';

describe('slugify', () => {
  it('creates a stable URL-safe slug', () => {
    expect(slugify('India Cricket Jersey')).toBe('india-cricket-jersey');
    expect(isUrlSafeSlug('india-cricket-jersey')).toBe(true);
  });
});
