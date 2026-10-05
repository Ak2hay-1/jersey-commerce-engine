import type { Metadata } from 'next';
import { storeApi } from '../../lib/api';
import { serverStoreOptions } from '../../lib/server-options';
import { cachedBootstrap, cachedCategories, tenantKey } from '../../lib/cached-store';
import { CatalogLayout, type CatalogChip } from '../../components/catalog/catalog-layout';

type Search = {
  search?: string;
  categorySlug?: string;
  size?: string;
  sort?: string;
  page?: string;
};

export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }): Promise<Metadata> {
  const query = await searchParams;
  const title = query.search ? `Search: ${query.search}` : 'Products';
  return { title, alternates: { canonical: '/products' } };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}): Promise<React.JSX.Element> {
  const query = await searchParams;
  const options = await serverStoreOptions();
  const slug = tenantKey(options);
  const [store, result, categories] = await Promise.all([
    cachedBootstrap(slug),
    storeApi.products(
      {
        search: query.search,
        categorySlug: query.categorySlug,
        size: query.size,
        sort: query.sort,
        page: query.page ? Number(query.page) : 1,
        pageSize: 24,
      },
      options,
    ),
    cachedCategories(slug).catch(() => []),
  ]);

  const chips: CatalogChip[] = [
    { label: 'All kits', href: '/products', active: !query.categorySlug && !query.search },
    ...categories
      .filter((category) => !category.parentId)
      .map((category) => ({ label: category.name, href: `/category/${category.slug}` })),
  ];

  return (
    <CatalogLayout
      kicker={query.search ? 'Search' : 'Catalog'}
      title={query.search ? `“${query.search}”` : 'All jerseys'}
      description={
        query.search ? undefined : 'Club, national, kids and custom football kits — match-day ready.'
      }
      chips={chips}
      result={result}
      currency={store.tenant.currency}
      basePath="/products"
      query={query}
      emptyTitle={query.search ? 'No matches' : 'No kits found'}
      emptyDescription={
        query.search
          ? `We couldn’t find kits for “${query.search}”. Try a club, country or player name.`
          : 'Try another filter or browse the full catalog.'
      }
    />
  );
}
