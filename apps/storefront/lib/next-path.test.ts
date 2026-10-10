import { describe, expect, it } from 'vitest';
import { loginHref, safeNextPath } from './next-path';

describe('safeNextPath', () => {
  it('accepts same-site paths', () => {
    expect(safeNextPath('/account/orders')).toBe('/account/orders');
    expect(safeNextPath('/order/success/JF-1001?x=1')).toBe('/order/success/JF-1001?x=1');
  });

  it('rejects open-redirect shapes', () => {
    expect(safeNextPath('https://evil.example')).toBeNull();
    expect(safeNextPath('//evil.example')).toBeNull();
    expect(safeNextPath('/\\evil.example')).toBeNull();
    expect(safeNextPath('/redirect?u=https://evil.example')).toBeNull();
    expect(safeNextPath('javascript:alert(1)')).toBeNull();
    expect(safeNextPath('/a\nb')).toBeNull();
  });

  it('rejects auth pages to avoid loops and empty values', () => {
    expect(safeNextPath('/auth/login')).toBeNull();
    expect(safeNextPath('')).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });

  it('builds the login link', () => {
    expect(loginHref('/account/orders')).toBe('/auth/login?next=%2Faccount%2Forders');
    expect(loginHref('https://evil.example')).toBe('/auth/login');
  });
});
