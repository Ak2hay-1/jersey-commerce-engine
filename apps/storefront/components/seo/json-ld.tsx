import type { StorefrontBootstrap, StorefrontProductDetail } from '@jersey-commerce/types';

export function JsonLd({ data }: { data: Record<string, unknown> }): React.JSX.Element {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function organizationJsonLd(store: StorefrontBootstrap, origin: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: store.tenant.name,
    url: origin,
    logo: store.theme.logo ?? undefined,
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
    image: image ? [image] : undefined,
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
