'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { StorefrontCatalogFacets } from '@jersey-commerce/types';
import { Input } from '../ui/input';

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price low → high' },
  { value: 'price-desc', label: 'Price high → low' },
  { value: 'name', label: 'Name' },
];

export function CatalogFilters({ facets }: { facets: StorefrontCatalogFacets }): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <form className="grid gap-4" onSubmit={(event) => event.preventDefault()}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Filter</p>
      <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider">
        Search
        <Input
          defaultValue={params.get('search') ?? ''}
          placeholder="Name, SKU, brand"
          onBlur={(event) => setParam('search', event.target.value.trim())}
        />
      </label>
      <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider">
        Sort
        <select
          className="h-11 border border-input bg-background px-2 text-sm font-normal normal-case"
          value={params.get('sort') ?? 'featured'}
          onChange={(event) => setParam('sort', event.target.value)}
        >
          {SORTS.map((sort) => (
            <option key={sort.value} value={sort.value}>
              {sort.label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider">
        Size
        <select
          className="h-11 border border-input bg-background px-2 text-sm font-normal normal-case"
          value={params.get('size') ?? ''}
          onChange={(event) => setParam('size', event.target.value)}
        >
          <option value="">All sizes</option>
          {facets.sizes.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider">
        Colour
        <select
          className="h-11 border border-input bg-background px-2 text-sm font-normal normal-case"
          value={params.get('colour') ?? ''}
          onChange={(event) => setParam('colour', event.target.value)}
        >
          <option value="">All colours</option>
          {facets.colours.map((colour) => (
            <option key={colour} value={colour}>
              {colour}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider">
        Brand
        <select
          className="h-11 border border-input bg-background px-2 text-sm font-normal normal-case"
          value={params.get('brand') ?? ''}
          onChange={(event) => setParam('brand', event.target.value)}
        >
          <option value="">All brands</option>
          {facets.brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider">
        Min price
        <Input defaultValue={params.get('minPrice') ?? ''} inputMode="decimal" onBlur={(event) => setParam('minPrice', event.target.value)} />
      </label>
      <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider">
        Max price
        <Input defaultValue={params.get('maxPrice') ?? ''} inputMode="decimal" onBlur={(event) => setParam('maxPrice', event.target.value)} />
      </label>
    </form>
  );
}
