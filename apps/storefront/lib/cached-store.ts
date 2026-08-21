import { cache } from 'react';
import type {
  CategoryDetail,
  StorefrontBootstrap,
  StorefrontProductDetail,
  StorefrontProductListItem,
  StorefrontProductListResult,
} from '@jersey-commerce/types';
import { storeApi, type StoreRequestOptions } from './api';

/** Per-request dedupe for layout + page + metadata sharing the same RSC tree. */

export const cachedBootstrap = cache(
  async (tenantSlug: string): Promise<StorefrontBootstrap> => storeApi.bootstrap({ tenantSlug }),
);

export const cachedProduct = cache(
  async (tenantSlug: string, slug: string): Promise<StorefrontProductDetail> =>
    storeApi.product(slug, { tenantSlug }),
);

export const cachedCategories = cache(
  async (tenantSlug: string): Promise<CategoryDetail[]> => storeApi.categories({ tenantSlug }),
);

export const cachedFeatured = cache(
  async (tenantSlug: string): Promise<StorefrontProductListItem[]> => storeApi.featured({ tenantSlug }),
);

export const cachedProducts = cache(
  async (tenantSlug: string, queryKey: string): Promise<StorefrontProductListResult> => {
    const query = JSON.parse(queryKey) as Parameters<typeof storeApi.products>[0];
    return storeApi.products(query, { tenantSlug });
  },
);

export function productsQueryKey(query: Parameters<typeof storeApi.products>[0]): string {
  return JSON.stringify(query);
}

export function tenantKey(options?: StoreRequestOptions): string {
  return options?.tenantSlug ?? '';
}
