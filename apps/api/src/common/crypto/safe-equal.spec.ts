import { safeEqual } from './safe-equal';

describe('safeEqual', () => {
  it('matches identical strings', () => {
    expect(safeEqual('abc123', 'abc123')).toBe(true);
  });

  it('rejects different strings and different lengths', () => {
    expect(safeEqual('abc123', 'abc124')).toBe(false);
    expect(safeEqual('abc', 'abc123')).toBe(false);
  });

  it('rejects empty or missing values', () => {
    expect(safeEqual('', '')).toBe(false);
    expect(safeEqual(undefined, 'abc')).toBe(false);
    expect(safeEqual('abc', null)).toBe(false);
  });
});
