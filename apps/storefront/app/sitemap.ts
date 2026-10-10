import type { MetadataRoute } from 'next';
import { storeApi } from '@/lib/api';
import { siteUrl } from '@/lib/site-url';

export const revalidate = 3600;

const STATIC_PATHS = [
  '',
  '/products',
  '/custom-orders',
  '/wholesale',
  '/about',
  '/privacy',
  '/terms',
  '/refund-policy',
  '/shipping-policy',
  '/grievance',
];
const PAGE_SIZE = 100;
const MAX_PAGES = 20;

async function productEntries(base: string): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await storeApi.products({ page, pageSize: PAGE_SIZE }, { next: { revalidate } });
    for (const product of result.items) {
      entries.push({
        url: `${base}/products/${encodeURIComponent(product.slug)}`,
        lastModified: product.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
    if (page >= result.meta.totalPages) {
      break;
    }
  }
  return entries;
}

async function categoryEntries(base: string): Promise<MetadataRoute.Sitemap> {
  const categories = await storeApi.categories({ next: { revalidate } });
  return categories.map((category) => ({
    url: `${base}/category/${encodeURIComponent(category.slug)}`,
    lastModified: category.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === '' ? 'daily' : 'monthly',
    priority: path === '' ? 1 : 0.4,
  }));
  const [products, categories] = await Promise.all([
    productEntries(base).catch(() => []),
    categoryEntries(base).catch(() => []),
  ]);
  return [...staticEntries, ...products, ...categories];
}
