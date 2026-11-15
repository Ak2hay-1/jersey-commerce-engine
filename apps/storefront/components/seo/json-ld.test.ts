import { afterEach, describe, expect, it } from 'vitest';
import { absoluteAssetUrl, organizationJsonLd, productJsonLd, serializeJsonLd } from './json-ld';
import type { StorefrontBootstrap, StorefrontProductDetail } from '@jersey-commerce/types';

describe('serializeJsonLd', () => {
  it('cannot close the surrounding script tag', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('</script>');
    expect(out).not.toContain('<');
    expect(JSON.parse(out)).toEqual({ name: '</script><script>alert(1)</script>' });
  });
});

describe('absoluteAssetUrl', () => {
  const previousApiUrl = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    if (previousApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = previousApiUrl;
    }
  });

  it('resolves media paths against the public API when configured', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.jerzyfy.in';
    expect(absoluteAssetUrl('/api/v1/media/logo.png', 'https://www.jerzyfy.in')).toBe(
      'https://api.jerzyfy.in/api/v1/media/logo.png',
    );
    expect(absoluteAssetUrl('https://cdn.example/logo.png', 'https://www.jerzyfy.in')).toBe(
      'https://cdn.example/logo.png',
    );
    expect(absoluteAssetUrl(null, 'https://www.jerzyfy.in')).toBeUndefined();
  });

  it('falls back to the page origin for media when the API URL is unset', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(absoluteAssetUrl('/api/v1/media/logo.png', 'https://www.jerzyfy.in')).toBe(
      'https://www.jerzyfy.in/api/v1/media/logo.png',
    );
  });

  it('puts absolute logo and product image URLs in structured data', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.jerzyfy.in';
    const origin = 'https://www.jerzyfy.in';
    const store = {
      tenant: { name: 'Jerzyfy' },
      theme: { logo: '/api/v1/media/logo.png' },
      website: {},
    } as StorefrontBootstrap;
    expect(organizationJsonLd(store, origin).logo).toBe('https://api.jerzyfy.in/api/v1/media/logo.png');

    const product = {
      name: 'Home kit',
      slug: 'home-kit',
      images: [{ url: '/api/v1/media/kit.jpg' }],
      variants: [],
    } as unknown as StorefrontProductDetail;
    expect(productJsonLd(product, origin, 'INR').image).toEqual(['https://api.jerzyfy.in/api/v1/media/kit.jpg']);
  });
});
