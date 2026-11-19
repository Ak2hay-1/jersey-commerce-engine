'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import type { StorefrontProductListResult } from '@jersey-commerce/types';
import { storeApi } from '../../lib/api';
import type { CatalogSearch } from '../../lib/catalog-query';
import { CatalogLayout, type CatalogChip } from './catalog-layout';

function queryFromParams(
  params: URLSearchParams,
  fixed: { categorySlug?: string } = {},
): CatalogSearch {
  return {
    search: params.get('search') ?? undefined,
    categorySlug: fixed.categorySlug ?? params.get('categorySlug') ?? undefined,
    size: params.get('size') ?? undefined,
    sort: params.get('sort') ?? undefined,
    page: params.get('page') ?? undefined,
  };
}

function queryKey(query: CatalogSearch): string {
  return JSON.stringify({
    search: query.search ?? '',
    categorySlug: query.categorySlug ?? '',
    size: query.size ?? '',
    sort: query.sort ?? '',
    page: String(query.page ?? '1'),
  });
}

/**
 * Keeps catalog HTML on the ISR path: the server renders the default list,
 * and filter/search/pagination query strings are applied client-side so
 * `searchParams` never opts the route into dynamic rendering.
 */
export function CatalogView({
  kicker,
  title,
  description,
  image,
  chips = [],
  initialResult,
  currency,
  basePath,
  categorySlug,
  emptyTitle,
  emptyDescription,
  breadcrumb,
}: {
  kicker?: string;
  title: string;
  description?: string | null;
  image?: string | null;
  chips?: CatalogChip[];
  initialResult: StorefrontProductListResult;
  currency: string;
  basePath: string;
  categorySlug?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  breadcrumb?: ReactNode;
}): React.JSX.Element {
  const params = useSearchParams();
  const query = queryFromParams(params, { categorySlug });
  const key = queryKey(query);
  const defaultKey = queryKey({ categorySlug, page: '1' });
  const [result, setResult] = useState(initialResult);
  const [activeKey, setActiveKey] = useState(defaultKey);

  useEffect(() => {
    setResult(initialResult);
    setActiveKey(defaultKey);
  }, [initialResult, defaultKey]);

  useEffect(() => {
    if (key === defaultKey) {
      setResult(initialResult);
      setActiveKey(defaultKey);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    storeApi
      .products(
        {
          search: query.search,
          categorySlug: query.categorySlug,
          size: query.size,
          sort: query.sort,
          page: query.page ? Number(query.page) : 1,
          pageSize: 24,
        },
        { signal: controller.signal },
      )
      .then((next) => {
        if (!cancelled) {
          setResult(next);
          setActiveKey(key);
        }
      })
      .catch(() => {
        // Keep the last good result if the request fails or is aborted.
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [key, defaultKey, initialResult, query.search, query.categorySlug, query.size, query.sort, query.page]);

  const display = key === defaultKey ? initialResult : result;
  const searchActive = Boolean(query.search?.trim());

  return (
    <CatalogLayout
      kicker={searchActive ? 'Search' : kicker}
      title={searchActive ? `“${query.search}”` : title}
      description={searchActive ? undefined : description}
      image={image}
      chips={chips}
      result={display}
      currency={currency}
      basePath={basePath}
      query={query}
      emptyTitle={searchActive ? 'No matches' : emptyTitle}
      emptyDescription={
        searchActive
          ? `We couldn’t find kits for “${query.search}”. Try a club, country or player name.`
          : emptyDescription
      }
      breadcrumb={breadcrumb}
    />
  );
}
