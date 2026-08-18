import { storefrontAvailability, toFacets } from './store-catalog.mapper';

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
