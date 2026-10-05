import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, SearchX } from 'lucide-react';
import type { StorefrontProductListResult } from '@jersey-commerce/types';
import { cn } from '@jersey-commerce/ui';
import { ProductGrid } from './product-grid';
import { ProductImage } from './product-image';
import { CatalogFilters } from './catalog-filters';
import { EmptyState } from '../ui/empty-state';
import { catalogHref, type CatalogSearch } from '../../lib/catalog-query';

export type CatalogChip = { label: string; href: string; active?: boolean };

function pageWindow(current: number, total: number): Array<number | 'gap'> {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  const result: Array<number | 'gap'> = [];
  for (const page of sorted) {
    const previous = result[result.length - 1];
    if (typeof previous === 'number' && page - previous > 1) {
      result.push('gap');
    }
    result.push(page);
  }
  return result;
}

function Pagination({
  basePath,
  query,
  page,
  totalPages,
}: {
  basePath: string;
  query: CatalogSearch;
  page: number;
  totalPages: number;
}): React.JSX.Element | null {
  if (totalPages <= 1) {
    return null;
  }
  const item = 'flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-semibold tabular transition-colors';
  return (
    <nav className="flex items-center justify-center gap-1.5 pt-6" aria-label="Pagination">
      {page > 1 ? (
        <Link href={catalogHref(basePath, query, page - 1)} className="icon-btn" aria-label="Previous page">
          <ChevronLeft className="h-5 w-5" />
        </Link>
      ) : (
        <span className="icon-btn opacity-30" aria-hidden>
          <ChevronLeft className="h-5 w-5" />
        </span>
      )}
      {pageWindow(page, totalPages).map((entry, index) =>
        entry === 'gap' ? (
          <span key={`gap-${index}`} className="px-1 text-muted-foreground" aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={catalogHref(basePath, query, entry)}
            aria-current={entry === page ? 'page' : undefined}
            className={cn(item, entry === page ? 'bg-foreground text-background' : 'text-foreground/70 hover:bg-white/[0.06] hover:text-foreground')}
          >
            {entry}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link href={catalogHref(basePath, query, page + 1)} className="icon-btn" aria-label="Next page">
          <ChevronRight className="h-5 w-5" />
        </Link>
      ) : (
        <span className="icon-btn opacity-30" aria-hidden>
          <ChevronRight className="h-5 w-5" />
        </span>
      )}
    </nav>
  );
}

export function CatalogLayout({
  kicker,
  title,
  description,
  image,
  chips = [],
  result,
  currency,
  basePath,
  query,
  emptyTitle = 'No kits found',
  emptyDescription = 'Try another filter or browse the full catalog.',
  breadcrumb,
}: {
  kicker?: string;
  title: string;
  description?: string | null;
  image?: string | null;
  chips?: CatalogChip[];
  result: StorefrontProductListResult;
  currency: string;
  basePath: string;
  query: CatalogSearch;
  emptyTitle?: string;
  emptyDescription?: string;
  breadcrumb?: ReactNode;
}): React.JSX.Element {
  return (
    <div className="pb-[var(--space-section)]">
      <header className="relative isolate overflow-hidden border-b border-white/[0.06]">
        {image ? (
          <>
            <ProductImage src={image} alt="" className="-z-20 object-cover opacity-40" sizes="100vw" priority fill />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/70 to-background/30" />
          </>
        ) : (
          <div
            className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_100%_at_15%_0%,hsl(var(--accent)/0.16),transparent_70%)]"
            aria-hidden
          />
        )}
        <div className="mx-auto max-w-store store-gutter pb-8 pt-8 md:pb-10 md:pt-14">
          {breadcrumb}
          {kicker ? <p className="section-kicker">{kicker}</p> : null}
          <h1 className="font-display mt-3 break-words text-[clamp(2.5rem,7vw,5rem)]">{title}</h1>
          {description ? <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{description}</p> : null}
          {chips.length ? (
            <div className="rail-scroll -mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-1">
              {chips.map((chip) => (
                <Link key={chip.href} href={chip.href} className="chip" aria-current={chip.active ? 'page' : undefined}>
                  {chip.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <div className="mx-auto max-w-store store-gutter">
        <div className="sticky top-14 z-20 -mx-[max(1rem,env(safe-area-inset-left))] bg-background/90 px-[max(1rem,env(safe-area-inset-left))] backdrop-blur-md sm:top-16 md:-mx-8 md:px-8">
          <CatalogFilters facets={result.facets} total={result.meta.totalItems} />
        </div>
        <div className="mt-8 space-y-8">
          {result.items.length === 0 ? (
            <EmptyState
              as="h2"
              icon={<SearchX className="h-7 w-7" />}
              title={emptyTitle}
              description={emptyDescription}
              actionHref="/products"
              actionLabel="Browse all kits"
            />
          ) : (
            <ProductGrid products={result.items} currency={currency} />
          )}
          <Pagination basePath={basePath} query={query} page={result.meta.page} totalPages={result.meta.totalPages} />
        </div>
      </div>
    </div>
  );
}
