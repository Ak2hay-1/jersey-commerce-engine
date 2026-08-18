import type { Metadata } from 'next';
import { storeApi } from '../../lib/api';
import { serverStoreOptions } from '../../lib/server-options';
import { ProductGrid } from '../../components/catalog/product-grid';
import { CatalogFilters } from '../../components/catalog/catalog-filters';
import { EmptyState } from '../../components/ui/empty-state';
import { catalogHref } from '../../lib/catalog-query';

type Search = {
  search?: string;
  categorySlug?: string;
  size?: string;
  colour?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
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
  const store = await storeApi.bootstrap(options);
  const result = await storeApi.products(
    {
      search: query.search,
      categorySlug: query.categorySlug,
      size: query.size,
      colour: query.colour,
      brand: query.brand,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      sort: query.sort,
      page: query.page ? Number(query.page) : 1,
      pageSize: 24,
    },
    options,
  );

  return (
    <div className="mx-auto max-w-store px-4 py-10">
      <div className="mb-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Catalog</p>
        <h1 className="mt-2 font-heading text-5xl uppercase tracking-tight md:text-6xl">
          {query.search ? `Results for “${query.search}”` : 'All products'}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{result.meta.totalItems} pieces</p>
      </div>
      <div className="grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside>
          <CatalogFilters facets={result.facets} />
        </aside>
        <div className="space-y-8">
          {result.items.length === 0 ? (
            <EmptyState title="No products found" description="Try another filter or browse the full catalog." actionHref="/products" actionLabel="Clear filters" />
          ) : (
            <ProductGrid products={result.items} currency={store.tenant.currency} />
          )}
          {result.meta.totalPages > 1 ? (
            <nav className="flex justify-center gap-4 text-sm" aria-label="Pagination">
              {result.meta.page > 1 ? (
                <a className="underline" href={catalogHref('/products', query, result.meta.page - 1)}>
                  Previous
                </a>
              ) : null}
              <span>
                Page {result.meta.page} of {result.meta.totalPages}
              </span>
              {result.meta.page < result.meta.totalPages ? (
                <a className="underline" href={catalogHref('/products', query, result.meta.page + 1)}>
                  Next
                </a>
              ) : null}
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  );
}
