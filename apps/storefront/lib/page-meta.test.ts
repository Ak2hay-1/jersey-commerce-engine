import { describe, expect, it } from 'vitest';
import { categoryMetaDescription, pageShare, productMetaDescription } from './page-meta';

describe('pageShare', () => {
  it('sets share tags for the page instead of inheriting the homepage', () => {
    const meta = pageShare({
      title: 'Cart',
      description: 'Review the football jerseys in your Jerzyfy cart before checkout.',
      path: '/cart',
    });
    expect(meta.alternates).toEqual({ canonical: '/cart' });
    expect(meta.openGraph).toMatchObject({
      type: 'website',
      url: '/cart',
      title: 'Cart',
      description: 'Review the football jerseys in your Jerzyfy cart before checkout.',
      images: [{ url: '/demo/hero.jpg', width: 1200, height: 630 }],
    });
    expect(meta.twitter).toMatchObject({
      title: 'Cart',
      images: ['/demo/hero.jpg'],
    });
  });

  it('can mark a page absolute and noindex', () => {
    const meta = pageShare({
      title: 'Jerzyfy — Club, national and custom football jerseys',
      path: '/',
      absoluteTitle: true,
      noIndex: true,
    });
    expect(meta.title).toEqual({ absolute: 'Jerzyfy — Club, national and custom football jerseys' });
    expect(meta.robots).toEqual({ index: false, follow: false });
  });
});

describe('catalog descriptions', () => {
  it('writes distinct copy for master version and falls back for other empty categories', () => {
    expect(categoryMetaDescription('master-version', 'MASTER VERSION', null)).toMatch(/fan fit/i);
    expect(categoryMetaDescription('player-versions', 'PLAYER VERSIONS', 'Slimmer match cut.')).toBe(
      'Slimmer match cut.',
    );
    expect(categoryMetaDescription('kids', 'Kids', '  ')).toBe('Shop Kids football jerseys at Jerzyfy.');
  });

  it('uses the Barcelona home-kit sentence when SEO fields are empty', () => {
    expect(
      productMetaDescription({
        slug: 'fc-barcelona-26-27-home-kit',
        seoDescription: null,
        shortDescription: null,
      }),
    ).toMatch(/Barcelona 26\/27 home/);
    expect(
      productMetaDescription({
        slug: 'fc-barcelona-26-27-home-kit',
        seoDescription: 'Custom SEO',
        shortDescription: null,
      }),
    ).toBe('Custom SEO');
  });
});
