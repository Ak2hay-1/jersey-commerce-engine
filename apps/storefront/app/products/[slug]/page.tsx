import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { storeApi } from '../../../lib/api';
import { serverStoreOptions } from '../../../lib/server-options';
import { StoreApiError } from '../../../lib/errors';
import { ProductGallery } from '../../../components/catalog/product-gallery';
import { ProductDetailActions } from '../../../components/catalog/product-detail-actions';
import { ProductGrid } from '../../../components/catalog/product-grid';
import { JsonLd, breadcrumbJsonLd, productJsonLd } from '../../../components/seo/json-ld';
import { headers } from 'next/headers';

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await storeApi.product(slug, await serverStoreOptions());
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
  const host = (await headers()).get('host');
  const origin = `${host?.includes('localhost') ? 'http' : 'https'}://${host ?? 'localhost:3000'}`;
  let product;
  try {
    product = await storeApi.product(slug, options);
  } catch (error) {
    if (error instanceof StoreApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
  const store = await storeApi.bootstrap(options);
  const crumbs = [
    { name: 'Home', href: '/' },
    ...(product.category ? [{ name: product.category.name, href: `/category/${product.category.slug}` }] : []),
    { name: product.name, href: `/products/${product.slug}` },
  ];

  return (
    <div className="mx-auto max-w-store px-4 py-10">
      <nav className="mb-6 text-xs uppercase tracking-wider text-muted-foreground" aria-label="Breadcrumb">
        {crumbs.map((crumb, index) => (
          <span key={crumb.href}>
            {index > 0 ? ' / ' : null}
            <Link href={crumb.href}>{crumb.name}</Link>
          </span>
        ))}
      </nav>
      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />
        <div className="space-y-4">
          {product.brand ? <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{product.brand}</p> : null}
          <h1 className="font-heading text-4xl uppercase tracking-wide md:text-5xl">{product.name}</h1>
          {product.shortDescription ? <p className="text-muted-foreground">{product.shortDescription}</p> : null}
          <ProductDetailActions product={product} currency={store.tenant.currency} />
          {product.description ? <div className="prose prose-sm max-w-none pt-6 text-sm leading-relaxed">{product.description}</div> : null}
        </div>
      </div>
      {product.related.length > 0 ? (
        <section className="mt-16">
          <h2 className="font-heading text-3xl uppercase tracking-wide">Related</h2>
          <div className="mt-6">
            <ProductGrid products={product.related} currency={store.tenant.currency} />
          </div>
        </section>
      ) : null}
      <JsonLd data={productJsonLd(product, origin, store.tenant.currency)} />
      <JsonLd data={breadcrumbJsonLd(crumbs, origin)} />
    </div>
  );
}
