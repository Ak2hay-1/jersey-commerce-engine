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

function organizationAddress(store: StorefrontBootstrap) {
  const street = store.website.contactAddress?.trim() || store.tenant.address?.trim() || undefined;
  const city = store.tenant.city?.trim() || undefined;
  const region = store.tenant.state?.trim() || undefined;
  const postalCode = store.tenant.postalCode?.trim() || undefined;
  const country = store.tenant.country?.trim() || undefined;
  if (!street && !city && !region && !postalCode && !country) {
    return undefined;
  }
  return {
    '@type': 'PostalAddress',
    streetAddress: street,
    addressLocality: city,
    addressRegion: region,
    postalCode,
    addressCountry: country,
  };
}

export function organizationJsonLd(store: StorefrontBootstrap, origin: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: store.tenant.name,
    url: origin,
    logo: absoluteAssetUrl(store.theme.logo, origin),
    email: store.website.contactEmail ?? store.tenant.contactEmail ?? undefined,
    telephone: store.website.contactPhone ?? store.tenant.contactPhone ?? undefined,
    address: organizationAddress(store),
  };
}

function productDescription(product: StorefrontProductDetail): string | undefined {
  const parts = [
    product.seoDescription?.trim(),
    product.shortDescription?.trim(),
    product.description?.trim(),
    product.category?.name ? `${product.name} — ${product.category.name} football jersey from Jerzyfy.` : undefined,
    product.name,
  ].filter(Boolean);
  return parts[0];
}

export function productJsonLd(product: StorefrontProductDetail, origin: string, currency: string) {
  const images = product.images
    .map((image) => absoluteAssetUrl(image.url, origin))
    .filter((url): url is string => Boolean(url));
  const primarySku = product.variants[0]?.sku;
  const offers = product.variants.map((variant) => ({
    '@type': 'Offer',
    sku: variant.sku,
    mpn: variant.sku,
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
    description: productDescription(product),
    image: images.length ? images : undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : { '@type': 'Brand', name: 'Jerzyfy' },
    sku: primarySku,
    mpn: primarySku,
    productID: product.slug,
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
