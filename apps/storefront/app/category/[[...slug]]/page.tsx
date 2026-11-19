import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ChevronRight } from 'lucide-react';
import { storeApi } from '../../../lib/api';
import { serverTenantOptions } from '../../../lib/server-options';
import { cachedBootstrap, cachedCategories, tenantKey } from '../../../lib/cached-store';
import { StoreApiError } from '../../../lib/errors';
import { CatalogView } from '../../../components/catalog/catalog-view';
import type { CatalogChip } from '../../../components/catalog/catalog-layout';
import { JsonLd, breadcrumbJsonLd } from '../../../components/seo/json-ld';
import { categoryMetaDescription, pageShare } from '../../../lib/page-meta';
import { siteUrl } from '../../../lib/site-url';

type Params = { slug?: string[] };

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<Array<{ slug: string[] }>> {
  try {
    const options = await serverTenantOptions();
    const categories = await cachedCategories(tenantKey(options));
    return categories.map((category) => ({ slug: [category.slug] }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug = [] } = await params;
  const leaf = slug[slug.length - 1];
  if (!leaf) {
    return { title: 'Category' };
  }
  try {
    const category = await storeApi.category(leaf, slug.join('/'), await serverTenantOptions());
    return pageShare({
      title: category.name,
      description: categoryMetaDescription(category.slug, category.name, category.description),
      path: `/category/${slug.join('/')}`,
      images: category.image ? [{ url: category.image }] : undefined,
    });
  } catch (error) {
    if (error instanceof StoreApiError && error.status === 404) {
      notFound();
    }
    return { title: 'Category' };
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<Params>;
}): Promise<React.JSX.Element> {
  const { slug = [] } = await params;
  if (slug.length === 0) {
    notFound();
  }
  const options = await serverTenantOptions();
  const leaf = slug[slug.length - 1] ?? '';
  let category;
  try {
    category = await storeApi.category(leaf, slug.join('/'), options);
  } catch (error) {
    if (error instanceof StoreApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
  const [store, result] = await Promise.all([
    cachedBootstrap(tenantKey(options)),
    storeApi.products(
      {
        categorySlug: category.slug,
        page: 1,
        pageSize: 24,
      },
      options,
    ),
  ]);
  const origin = siteUrl();
  const basePath = `/category/${slug.join('/')}`;
  const crumbs = [
    { name: 'Home', href: '/' },
    ...slug.map((part, index) => ({
      name: part.replace(/-/g, ' '),
      href: `/category/${slug.slice(0, index + 1).join('/')}`,
    })),
  ];
  crumbs[crumbs.length - 1] = { name: category.name, href: basePath };

  const chips: CatalogChip[] = category.children.length
    ? [
        { label: `All ${category.name}`, href: basePath, active: true },
        ...category.children.map((child) => ({ label: child.name, href: `${basePath}/${child.slug}` })),
      ]
    : [];

  const breadcrumb = (
    <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-xs capitalize text-muted-foreground" aria-label="Breadcrumb">
      {crumbs.slice(0, -1).map((crumb, index) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          {index > 0 ? <ChevronRight className="h-3 w-3 opacity-60" aria-hidden /> : null}
          <Link href={crumb.href} className="hover:text-foreground">
            {crumb.name}
          </Link>
        </span>
      ))}
    </nav>
  );

  return (
    <>
      <Suspense fallback={<div className="mx-auto max-w-store store-gutter py-16 text-sm text-muted-foreground">Loading kits…</div>}>
        <CatalogView
          kicker="Collection"
          title={category.name}
          description={category.description}
          image={category.image}
          chips={chips}
          initialResult={result}
          currency={store.tenant.currency}
          basePath={basePath}
          categorySlug={category.slug}
          emptyTitle="Nothing here yet"
          emptyDescription="No kits in this collection right now. Browse the full catalog instead."
          breadcrumb={breadcrumb}
        />
      </Suspense>
      <JsonLd data={breadcrumbJsonLd(crumbs, origin)} />
    </>
  );
}
