import type { Metadata } from 'next';

type ShareImage = string | { url: string; width?: number; height?: number; alt?: string };

/** Default share image for non-product pages when no page-specific asset is provided. */
export const DEFAULT_OG_IMAGE = '/demo/hero.jpg';

function normalizeShareImages(images: ShareImage[] | undefined): Array<{ url: string; width?: number; height?: number; alt?: string }> {
  const source = images?.length ? images : [DEFAULT_OG_IMAGE];
  return source.map((image) => {
    if (typeof image === 'string') {
      return { url: image, width: 1200, height: 630 };
    }
    return { width: 1200, height: 630, ...image };
  });
}

/** Page title, description, canonical, and share tags. Overrides the homepage Open Graph defaults. */
export function pageShare(input: {
  title: string;
  description?: string;
  path: string;
  /** Skip the layout title template. Use for the homepage so the brand is not repeated. */
  absoluteTitle?: boolean;
  images?: ShareImage[];
  noIndex?: boolean;
}): Metadata {
  const shareImages = normalizeShareImages(input.images);
  const openGraph: NonNullable<Metadata['openGraph']> = {
    type: 'website',
    siteName: 'Jerzyfy',
    url: input.path,
    title: input.title,
    description: input.description,
  };
  const twitter: NonNullable<Metadata['twitter']> = {
    card: 'summary_large_image',
    title: input.title,
    description: input.description,
  };
  if (shareImages.length) {
    openGraph.images = shareImages;
    twitter.images = shareImages.map((image) => image.url);
  }

  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    alternates: { canonical: input.path },
    ...(input.noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph,
    twitter,
  };
}

export const HOME_TITLE = 'Jerzyfy — Club, national and custom football jerseys';
export const PRODUCTS_DESCRIPTION =
  'Shop every Jerzyfy football jersey — club, national, player-version and master-version kits, with sizes and prices.';
export const MASTER_VERSION_DESCRIPTION =
  'Master-version football jerseys at Jerzyfy: the fuller fan fit for club and national kits, ready to wear.';
export const BARCELONA_HOME_DESCRIPTION =
  'FC Barcelona 26/27 home player-version jersey at Jerzyfy — blaugrana stripes, match cut, sizes S–XXL.';

export function categoryMetaDescription(slug: string, name: string, description?: string | null): string {
  const written = description?.trim();
  if (written) {
    return written;
  }
  if (slug === 'master-version') {
    return MASTER_VERSION_DESCRIPTION;
  }
  return `Shop ${name} football jerseys at Jerzyfy.`;
}

export function productMetaDescription(product: {
  slug: string;
  seoDescription?: string | null;
  shortDescription?: string | null;
}): string | undefined {
  if (product.seoDescription?.trim()) {
    return product.seoDescription.trim();
  }
  if (product.slug === 'fc-barcelona-26-27-home-kit') {
    return BARCELONA_HOME_DESCRIPTION;
  }
  return product.shortDescription?.trim() || undefined;
}
