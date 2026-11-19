import { describe, expect, it } from 'vitest';
import { parseScanValue } from './scan-value';

describe('parseScanValue', () => {
  it('returns empty for blank input', () => {
    expect(parseScanValue('   ')).toEqual({ raw: '', lookupQuery: '' });
  });

  it('treats a raw barcode or SKU as the lookup query', () => {
    expect(parseScanValue(' 8901234567890 ')).toEqual({
      raw: '8901234567890',
      lookupQuery: '8901234567890',
    });
    expect(parseScanValue('BARCA-HOME-L')).toEqual({
      raw: 'BARCA-HOME-L',
      lookupQuery: 'BARCA-HOME-L',
    });
  });

  it('extracts sku= query-style values', () => {
    expect(parseScanValue('sku=BARCA-HOME-L')).toEqual({
      raw: 'sku=BARCA-HOME-L',
      sku: 'BARCA-HOME-L',
      lookupQuery: 'BARCA-HOME-L',
    });
  });

  it('extracts SKU from a jerzyfy.in product URL query', () => {
    expect(parseScanValue('https://www.jerzyfy.in/products/fc-barcelona-26-27-home-kit?sku=BARCA-HOME-L')).toEqual({
      raw: 'https://www.jerzyfy.in/products/fc-barcelona-26-27-home-kit?sku=BARCA-HOME-L',
      sku: 'BARCA-HOME-L',
      lookupQuery: 'BARCA-HOME-L',
    });
  });

  it('extracts the product slug from a jerzyfy.in product URL', () => {
    expect(parseScanValue('https://www.jerzyfy.in/products/fc-barcelona-26-27-home-kit')).toEqual({
      raw: 'https://www.jerzyfy.in/products/fc-barcelona-26-27-home-kit',
      slug: 'fc-barcelona-26-27-home-kit',
      lookupQuery: 'fc-barcelona-26-27-home-kit',
    });
  });

  it('accepts protocol-relative jerzyfy hosts and trailing slashes', () => {
    expect(parseScanValue('www.jerzyfy.in/products/real-madrid-away/')).toEqual({
      raw: 'www.jerzyfy.in/products/real-madrid-away/',
      slug: 'real-madrid-away',
      lookupQuery: 'real-madrid-away',
    });
    expect(parseScanValue('jerzyfy.in/products/india-home?utm=pos')).toEqual({
      raw: 'jerzyfy.in/products/india-home?utm=pos',
      slug: 'india-home',
      lookupQuery: 'india-home',
    });
  });

  it('ignores non-jerzyfy URLs and leaves them as raw lookup text', () => {
    expect(parseScanValue('https://example.com/products/foo?sku=ABC')).toEqual({
      raw: 'https://example.com/products/foo?sku=ABC',
      lookupQuery: 'https://example.com/products/foo?sku=ABC',
    });
  });
});
