import type { StorefrontBootstrap, StorefrontProductDetail } from '@jersey-commerce/types';

export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function JsonLd({ data }: { data: Record<string, unknown> }): React.JSX.Element {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}

/** Structured data requires absolute asset URLs. Media paths resolve against the public API; others against the page origin. */
export function absoluteAssetUrl(url: string | null | undefined, origin: string): string | undefined {
  if (!url) {
    return undefined;
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  const path = url.startsWith('/') ? url : `/${url}`;
  if (path.startsWith('/api/v1/media')) {
    const api = (process.env.NEXT_PUBLIC_API_URL || origin).replace(/\/$/, '').replace(/\/api\/v1$/, '');
    return `${api}${path}`;
  }
  const base = origin.replace(/\/$/, '');
  return `${base}${path}`;
}

export function organizationJsonLd(store: StorefrontBootstrap, origin: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: store.tenant.name,
    url: origin,
    logo: absoluteAssetUrl(store.theme.logo, origin),
    email: store.website.contactEmail ?? undefined,
    telephone: store.website.contactPhone ?? undefined,
  };
}

export function productJsonLd(product: StorefrontProductDetail, origin: string, currency: string) {
  const image = product.images[0]?.url;
  const offers = product.variants.map((variant) => ({
    '@type': 'Offer',
    sku: variant.sku,
    priceCurrency: currency,
    price: variant.sellingPrice,
    availability:
      variant.availability === 'OUT_OF_STOCK' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
    url: `${origin}/products/${product.slug}`,
  }));
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.seoDescription || product.shortDescription || product.description || undefined,
    image: image ? [absoluteAssetUrl(image, origin)] : undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    sku: product.variants[0]?.sku,
    offers,
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; href: string }>, origin: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${origin}${item.href}`,
    })),
  };
}
