import { storeApi, type StoreRequestOptions } from './api';
import { DEFAULT_STORE_CHROME, type StoreChrome } from './swatch';

export async function loadStoreChrome(options?: StoreRequestOptions): Promise<StoreChrome> {
  try {
    const [catalog, featured] = await Promise.all([
      storeApi.products({ pageSize: 1 }, options),
      storeApi.featured(options),
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
