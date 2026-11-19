import type { Metadata } from 'next';
import { Suspense } from 'react';
import { storeApi } from '../../../lib/api';
import { serverTenantOptions } from '../../../lib/server-options';
import { cachedBootstrap, cachedCategories, emptyProductList, tenantKey } from '../../../lib/cached-store';
import { fallbackStore } from '../../../lib/fallback-store';
import { CatalogView } from '../../../components/catalog/catalog-view';
import type { CatalogChip } from '../../../components/catalog/catalog-layout';
import { pageShare, PRODUCTS_DESCRIPTION } from '../../../lib/page-meta';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return pageShare({
    title: 'Products',
    description: PRODUCTS_DESCRIPTION,
    path: '/products',
  });
}

export default async function ProductsPage(): Promise<React.JSX.Element> {
  const options = await serverTenantOptions();
  const slug = tenantKey(options);
  let store = fallbackStore;
  let result = emptyProductList();
  let categories: Awaited<ReturnType<typeof cachedCategories>> = [];
  try {
    const [boot, products, cats] = await Promise.all([
      cachedBootstrap(slug),
      storeApi.products({ page: 1, pageSize: 24 }, options),
      cachedCategories(slug).catch(() => []),
    ]);
    store = boot;
    result = products;
    categories = cats;
  } catch {
    // Build/ISR can proceed offline; runtime revalidation fills the catalog.
  }

  const chips: CatalogChip[] = [
    { label: 'All kits', href: '/products', active: true },
    ...categories
      .filter((category) => !category.parentId)
      .map((category) => ({ label: category.name, href: `/category/${category.slug}` })),
  ];

  return (
    <Suspense fallback={<div className="mx-auto max-w-store store-gutter py-16 text-sm text-muted-foreground">Loading kits…</div>}>
      <CatalogView
        kicker="Catalog"
        title="All jerseys"
        description="Club, national, and custom football kits — match-day ready."
        chips={chips}
        initialResult={result}
        currency={store.tenant.currency}
        basePath="/products"
        emptyTitle="No kits found"
        emptyDescription="Try another filter or browse the full catalog."
      />
    </Suspense>
  );
}
