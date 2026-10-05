import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { storeApi } from '../../../lib/api';
import { serverStoreOptions } from '../../../lib/server-options';
import { cachedBootstrap, tenantKey } from '../../../lib/cached-store';
import { StoreApiError } from '../../../lib/errors';
import { CatalogLayout, type CatalogChip } from '../../../components/catalog/catalog-layout';
import { JsonLd, breadcrumbJsonLd } from '../../../components/seo/json-ld';
import { headers } from 'next/headers';

type Params = { slug?: string[] };
type Search = {
  size?: string;
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
  const [store, result] = await Promise.all([
    cachedBootstrap(tenantKey(options)),
    storeApi.products(
      {
        categorySlug: category.slug,
        search: query.search,
        size: query.size,
        sort: query.sort,
        page: query.page ? Number(query.page) : 1,
        pageSize: 24,
      },
      options,
    ),
  ]);
  const host = (await headers()).get('host');
  const origin = `${host?.includes('localhost') ? 'http' : 'https'}://${host ?? 'localhost:3000'}`;
  const basePath = `/category/${slug.join('/')}`;
  const crumbs = [{ name: 'Home', href: '/' }, ...slug.map((part, index) => ({ name: part.replace(/-/g, ' '), href: `/category/${slug.slice(0, index + 1).join('/')}` }))];
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
      <CatalogLayout
        kicker="Collection"
        title={category.name}
        description={category.description}
        image={category.image}
        chips={chips}
        result={result}
        currency={store.tenant.currency}
        basePath={basePath}
        query={query}
        emptyTitle="Nothing here yet"
        emptyDescription="No kits in this collection right now. Browse the full catalog instead."
        breadcrumb={breadcrumb}
      />
      <JsonLd data={breadcrumbJsonLd(crumbs, origin)} />
    </>
  );
}
