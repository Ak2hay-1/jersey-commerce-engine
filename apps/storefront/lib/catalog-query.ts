export type CatalogSearch = {
  search?: string;
  categorySlug?: string;
  size?: string;
  colour?: string;
  brand?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  page?: string | number;
};

const KEYS = ['search', 'categorySlug', 'size', 'colour', 'brand', 'minPrice', 'maxPrice', 'sort'] as const;

export function catalogQueryString(query: CatalogSearch, page?: number): string {
  const params = new URLSearchParams();
  for (const key of KEYS) {
    const value = query[key]?.trim();
    if (value) {
      params.set(key, value);
    }
  }
  const nextPage = page ?? (query.page ? Number(query.page) : 1);
  if (nextPage > 1) {
    params.set('page', String(nextPage));
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

export function catalogHref(pathname: string, query: CatalogSearch, page?: number): string {
  return `${pathname}${catalogQueryString(query, page)}`;
}
