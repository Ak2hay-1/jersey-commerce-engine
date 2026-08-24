import { afterEach, describe, expect, it } from 'vitest';
import { resolveMediaUrl } from './env';

describe('resolveMediaUrl', () => {
  afterEach(() => {
    if (typeof window !== 'undefined') {
      delete window.__JCE_PUBLIC__;
    }
  });

  it('returns empty string for nullish values', () => {
    expect(resolveMediaUrl(null)).toBe('');
    expect(resolveMediaUrl(undefined)).toBe('');
    expect(resolveMediaUrl('')).toBe('');
  });

  it('leaves absolute http(s), data, and blob URLs unchanged', () => {
    expect(resolveMediaUrl('https://cdn.example/logo.png')).toBe('https://cdn.example/logo.png');
    expect(resolveMediaUrl('http://cdn.example/logo.png')).toBe('http://cdn.example/logo.png');
    expect(resolveMediaUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
    expect(resolveMediaUrl('blob:http://localhost/1')).toBe('blob:http://localhost/1');
  });

  it('prefixes root-relative media paths with the API host', () => {
    expect(resolveMediaUrl('/api/v1/media/tenants/x/logo.png')).toBe(
      'http://localhost:4000/api/v1/media/tenants/x/logo.png',
    );
  });

  it('returns other relative strings unchanged', () => {
    expect(resolveMediaUrl('uploads/logo.png')).toBe('uploads/logo.png');
  });
});
