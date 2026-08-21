import { storefrontAvailability, toFacets, toFooterConfig, toHomepageConfig } from './store-catalog.mapper';

describe('storefrontAvailability', () => {
  it('hides exact quantity when stock is healthy', () => {
    expect(storefrontAvailability(12)).toEqual({ availability: 'IN_STOCK', remaining: null });
  });

  it('exposes remaining units only when stock is low', () => {
    expect(storefrontAvailability(3)).toEqual({ availability: 'LOW_STOCK', remaining: 3 });
  });

  it('marks zero as out of stock without a remaining count', () => {
    expect(storefrontAvailability(0)).toEqual({ availability: 'OUT_OF_STOCK', remaining: null });
  });
});

describe('toFacets', () => {
  it('builds listing facets from variant size, colour, and price only', () => {
    expect(
      toFacets(
        [
          { size: 'M', color: 'Red', sellingPrice: { toFixed: () => '2499.00' } },
          { size: 'L', color: 'Red', sellingPrice: { toFixed: () => '2599.00' } },
        ],
        ['Demo Athletic', null],
      ),
    ).toEqual({
      sizes: ['L', 'M'],
      colours: ['Red'],
      brands: ['Demo Athletic'],
      minPrice: '2499.00',
      maxPrice: '2599.00',
    });
  });
});

describe('toHomepageConfig', () => {
  it('keeps hero slides with title and button fields', () => {
    const config = toHomepageConfig({
      sections: [
        {
          type: 'hero',
          enabled: true,
          slides: [
            {
              id: 'hero-1',
              image: 'https://cdn.example.com/banner.jpg',
              heading: 'New drop',
              subheading: 'Cut for the stands',
              ctaLabel: 'Shop',
              ctaHref: '/products',
            },
          ],
        },
        {
          type: 'new-arrivals',
          enabled: true,
          heading: 'Latest drop',
          productSlugs: ['the-night-shift-oversized-tee'],
        },
      ],
    });
    expect(config.sections[0]?.slides).toEqual([
      {
        id: 'hero-1',
        image: 'https://cdn.example.com/banner.jpg',
        heading: 'New drop',
        subheading: 'Cut for the stands',
        ctaLabel: 'Shop',
        ctaHref: '/products',
      },
    ]);
    expect(config.sections[1]?.productSlugs).toEqual(['the-night-shift-oversized-tee']);
  });
});

describe('toFooterConfig', () => {
  it('keeps edited footer copy and material lines', () => {
    expect(
      toFooterConfig({
        heading: 'Made for the stands',
        aboutBody: 'Custom footer about copy.',
        materials: ['Organic cotton.', 'Durable prints.'],
        showCollections: false,
      }),
    ).toMatchObject({
      heading: 'Made for the stands',
      aboutBody: 'Custom footer about copy.',
      materials: ['Organic cotton.', 'Durable prints.'],
      showCollections: false,
    });
  });
});
