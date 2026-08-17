import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { storeApi } from '../../../lib/api';
import { serverStoreOptions } from '../../../lib/server-options';
import { StoreApiError } from '../../../lib/errors';
import { ProductGrid } from '../../../components/catalog/product-grid';
import { CatalogFilters } from '../../../components/catalog/catalog-filters';
import { ProductImage } from '../../../components/catalog/product-image';
import { EmptyState } from '../../../components/ui/empty-state';
import { JsonLd, breadcrumbJsonLd } from '../../../components/seo/json-ld';
import { catalogHref } from '../../../lib/catalog-query';
import { headers } from 'next/headers';

type Params = { slug?: string[] };
type Search = {
  size?: string;
  colour?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  page?: string;
  search?: string;
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug = [] } = await params;
  const leaf = slug[slug.length - 1];
  if (!leaf) {
    return { title: 'Category' };
  }
  try {
    const category = await storeApi.category(leaf, slug.join('/'), await serverStoreOptions());
    return {
      title: category.name,
      description: category.description ?? undefined,
      alternates: { canonical: `/category/${slug.join('/')}` },
    };
  } catch {
    return { title: 'Category' };
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}): Promise<React.JSX.Element> {
  const { slug = [] } = await params;
  const query = await searchParams;
  if (slug.length === 0) {
    notFound();
  }
  const options = await serverStoreOptions();
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
  const store = await storeApi.bootstrap(options);
  const result = await storeApi.products(
    {
      categorySlug: category.slug,
      search: query.search,
      size: query.size,
      colour: query.colour,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      sort: query.sort,
      page: query.page ? Number(query.page) : 1,
      pageSize: 24,
    },
    options,
  );
  const host = (await headers()).get('host');
  const origin = `${host?.includes('localhost') ? 'http' : 'https'}://${host ?? 'localhost:3000'}`;
  const crumbs = [{ name: 'Home', href: '/' }, ...slug.map((part, index) => ({ name: part.replace(/-/g, ' '), href: `/category/${slug.slice(0, index + 1).join('/')}` }))];
  crumbs[crumbs.length - 1] = { name: category.name, href: `/category/${slug.join('/')}` };

  return (
    <div>
      {category.image ? (
        <div className="relative bg-muted">
          <ProductImage src={category.image} alt="" className="h-48 w-full object-cover md:h-72" sizes="100vw" priority />
          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-store px-4 py-8 text-white">
            <h1 className="font-heading text-4xl uppercase tracking-wide md:text-6xl">{category.name}</h1>
            {category.description ? <p className="mt-2 max-w-2xl text-white/80">{category.description}</p> : null}
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-store px-4 pt-10">
          <h1 className="font-heading text-4xl uppercase tracking-wide">{category.name}</h1>
          {category.description ? <p className="mt-2 text-muted-foreground">{category.description}</p> : null}
        </div>
      )}
      <div className="mx-auto max-w-store space-y-8 px-4 py-10">
        {category.children.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {category.children.map((child) => (
              <a key={child.id} href={`/category/${slug.join('/')}/${child.slug}`} className="border border-border px-3 py-2 text-sm uppercase tracking-wide hover:border-foreground">
                {child.name}
              </a>
            ))}
          </div>
        ) : null}
        <CatalogFilters facets={result.facets} />
        {result.items.length === 0 ? (
          <EmptyState title="No products in this category" description="Try another category or browse the full catalog." actionHref="/products" actionLabel="All products" />
        ) : (
          <ProductGrid products={result.items} currency={store.tenant.currency} />
        )}
        {result.meta.totalPages > 1 ? (
          <nav className="flex justify-center gap-4 text-sm" aria-label="Pagination">
            {result.meta.page > 1 ? (
              <a className="underline" href={catalogHref(`/category/${slug.join('/')}`, query, result.meta.page - 1)}>
                Previous
              </a>
            ) : null}
            <span>
              Page {result.meta.page} of {result.meta.totalPages}
            </span>
            {result.meta.page < result.meta.totalPages ? (
              <a className="underline" href={catalogHref(`/category/${slug.join('/')}`, query, result.meta.page + 1)}>
                Next
              </a>
            ) : null}
          </nav>
        ) : null}
      </div>
      <JsonLd data={breadcrumbJsonLd(crumbs, origin)} />
    </div>
  );
}
