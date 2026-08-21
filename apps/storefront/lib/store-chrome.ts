import { cachedFeatured, cachedProducts, productsQueryKey, tenantKey } from './cached-store';
import { DEFAULT_STORE_CHROME, type StoreChrome } from './swatch';
import type { StoreRequestOptions } from './api';

export async function loadStoreChrome(options?: StoreRequestOptions): Promise<StoreChrome> {
  const slug = tenantKey(options);
  try {
    const chromeProductsKey = productsQueryKey({ pageSize: 1 });
    const [catalog, featured] = await Promise.all([
      cachedProducts(slug, chromeProductsKey),
      cachedFeatured(slug),
    ]);
    const first = featured[0] ?? catalog.items[0];
    return {
      sizes: catalog.facets.sizes.length ? catalog.facets.sizes.slice(0, 4) : DEFAULT_STORE_CHROME.sizes,
      colours: catalog.facets.colours.length ? catalog.facets.colours.slice(0, 2) : DEFAULT_STORE_CHROME.colours,
      featuredName: first?.name ?? null,
      featuredSlug: first?.slug ?? null,
    };
  } catch {
    return DEFAULT_STORE_CHROME;
  }
}
