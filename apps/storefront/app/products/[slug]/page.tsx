import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { serverStoreOptions } from '../../../lib/server-options';
import { cachedBootstrap, cachedProduct, tenantKey } from '../../../lib/cached-store';
import { StoreApiError } from '../../../lib/errors';
import { ProductGallery } from '../../../components/catalog/product-gallery';
import { ProductDetailActions } from '../../../components/catalog/product-detail-actions';
import { ProductAccordions } from '../../../components/catalog/product-accordions';
import { ProductGrid } from '../../../components/catalog/product-grid';
import { JsonLd, breadcrumbJsonLd, productJsonLd } from '../../../components/seo/json-ld';
import { headers } from 'next/headers';

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const options = await serverStoreOptions();
    const product = await cachedProduct(tenantKey(options), slug);
    const title = product.seoTitle || product.name;
    const description = product.seoDescription || product.shortDescription || undefined;
    return {
      title,
      description,
      alternates: { canonical: `/products/${product.slug}` },
      openGraph: {
        title,
        description,
        images: product.images[0] ? [{ url: product.images[0].url }] : undefined,
      },
    };
  } catch {
    return { title: 'Product' };
  }
}

export default async function ProductPage({ params }: { params: Promise<Params> }): Promise<React.JSX.Element> {
  const { slug } = await params;
  const options = await serverStoreOptions();
  const tenantSlug = tenantKey(options);
  const host = (await headers()).get('host');
  const origin = `${host?.includes('localhost') ? 'http' : 'https'}://${host ?? 'localhost:3000'}`;

  let product;
  let store;
  try {
    const productPromise = cachedProduct(tenantSlug, slug);
    const storePromise = cachedBootstrap(tenantSlug);
    try {
      product = await productPromise;
    } catch (error) {
      if (error instanceof StoreApiError && error.status === 404) {
        notFound();
      }
      throw error;
    }
    store = await storePromise;
  } catch (error) {
    if (error instanceof StoreApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const crumbs = [
    { name: 'Home', href: '/' },
    ...(product.category ? [{ name: product.category.name, href: `/category/${product.category.slug}` }] : []),
    { name: product.name, href: `/products/${product.slug}` },
  ];

  return (
    <div className="mx-auto max-w-store store-gutter py-8 pb-24 md:py-10 md:pb-10">
      <nav className="mb-6 break-words text-[11px] uppercase tracking-[0.16em] text-muted-foreground md:mb-8" aria-label="Breadcrumb">
        {crumbs.map((crumb, index) => (
          <span key={crumb.href}>
            {index > 0 ? ' / ' : null}
            <Link href={crumb.href}>{crumb.name}</Link>
          </span>
        ))}
      </nav>
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <ProductGallery images={product.images} name={product.name} />
        <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {product.brand ? <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{product.brand}</p> : null}
          <h1 className="break-words font-heading text-3xl uppercase tracking-tight md:text-5xl">{product.name}</h1>
          {product.shortDescription ? <p className="text-muted-foreground">{product.shortDescription}</p> : null}
          <ProductDetailActions product={product} currency={store.tenant.currency} />
          {product.description ? (
            <div className="max-w-none pt-4 text-sm leading-relaxed text-muted-foreground">{product.description}</div>
          ) : null}
          <ProductAccordions />
        </div>
      </div>
      {product.related.length > 0 ? (
        <section className="mt-20">
          <h2 className="font-heading text-2xl uppercase tracking-wide md:text-3xl">You might also like</h2>
          <div className="mt-8">
            <ProductGrid products={product.related} currency={store.tenant.currency} />
          </div>
        </section>
      ) : null}
      <JsonLd data={productJsonLd(product, origin, store.tenant.currency)} />
      <JsonLd data={breadcrumbJsonLd(crumbs, origin)} />
    </div>
  );
}
