import { SkuGenerator } from './sku-generator';

describe('SkuGenerator', () => {
  const generator = new SkuGenerator();

  it('does not overwrite an occupied SKU', () => {
    const occupied = new Set(['INDJER-L']);
    const sku = generator.generate({ productSlug: 'ind-jer', size: 'L', occupied });
    expect(sku).toBe('INDJER-L-2');
  });

  it('uses a provided SKU when unique', () => {
    const occupied = new Set<string>();
    expect(generator.resolve('ind-jer-l', { productSlug: 'x', occupied })).toBe('IND-JER-L');
  });
});
