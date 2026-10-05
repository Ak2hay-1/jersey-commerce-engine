import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { serverStoreOptions } from '../../../lib/server-options';
import { cachedBootstrap, cachedProduct, tenantKey } from '../../../lib/cached-store';
import { StoreApiError } from '../../../lib/errors';
import { ProductGallery } from '../../../components/catalog/product-gallery';
import { ProductDetailActions } from '../../../components/catalog/product-detail-actions';
import { ProductAccordions } from '../../../components/catalog/product-accordions';
import { ProductRail } from '../../../components/catalog/product-rail';
import { ChevronRight } from 'lucide-react';
import { JsonLd, breadcrumbJsonLd, productJsonLd } from '../../../components/seo/json-ld';
import { headers } from 'next/headers';

type Params = { slug: string };

export const dynamic = 'force-dynamic';

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

  const kicker = [product.brand, product.category?.name].filter(Boolean).join(' · ');

  return (
    <div className="pb-28 md:pb-0">
      <div className="mx-auto max-w-store store-gutter pt-5 md:pt-8">
        <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground md:mb-8" aria-label="Breadcrumb">
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1;
            return (
              <span key={crumb.href} className="flex min-w-0 items-center gap-1.5">
                {index > 0 ? <ChevronRight className="h-3 w-3 shrink-0 opacity-60" aria-hidden /> : null}
                {last ? (
                  <span className="truncate text-foreground/80" aria-current="page">
                    {crumb.name}
                  </span>
                ) : (
                  <Link href={crumb.href} className="hover:text-foreground">
                    {crumb.name}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <ProductGallery images={product.images} name={product.name} />
          </div>
          <div className="lg:col-span-5">
            <div className="space-y-7 lg:sticky lg:top-24">
              <div className="space-y-3">
                {kicker ? <p className="text-micro text-muted-foreground">{kicker}</p> : null}
                <h1 className="font-display break-words text-[clamp(2.25rem,4.4vw,3.5rem)]">{product.name}</h1>
                {product.shortDescription ? (
                  <p className="text-[15px] leading-relaxed text-muted-foreground">{product.shortDescription}</p>
                ) : null}
              </div>
              <ProductDetailActions product={product} currency={store.tenant.currency} />
              <ProductAccordions description={product.description} />
            </div>
          </div>
        </div>
      </div>
      {product.related.length > 0 ? (
        <ProductRail
          kicker="Complete the kit"
          title="You might also like"
          products={product.related}
          currency={store.tenant.currency}
          viewAllHref={product.category ? `/category/${product.category.slug}` : '/products'}
        />
      ) : null}
      <JsonLd data={productJsonLd(product, origin, store.tenant.currency)} />
      <JsonLd data={breadcrumbJsonLd(crumbs, origin)} />
    </div>
  );
}
