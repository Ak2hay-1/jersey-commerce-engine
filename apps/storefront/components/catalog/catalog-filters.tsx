'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SlidersHorizontal, X } from 'lucide-react';
import type { StorefrontCatalogFacets } from '@jersey-commerce/types';
import { MOTION_DRAWER, MOTION_TRANSITION } from '../motion/presence';

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name' },
];

function useCatalogParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParams(updates: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }
    next.delete('page');
    const encoded = next.toString();
    router.push(encoded ? `${pathname}?${encoded}` : pathname);
  }

  function setParam(key: string, value: string) {
    setParams({ [key]: value });
  }

  return { params, setParam, setParams };
}

function SizeChips({
  sizes,
  active,
  onPick,
}: {
  sizes: string[];
  active: string;
  onPick: (size: string) => void;
}): React.JSX.Element {
  return (
    <>
      {sizes.map((size) => (
        <button
          key={size}
          type="button"
          className="chip min-w-11 cursor-pointer justify-center"
          aria-pressed={active === size}
          onClick={() => onPick(active === size ? '' : size)}
        >
          {size}
        </button>
      ))}
    </>
  );
}

export function CatalogFilters({
  facets,
  total,
}: {
  facets: StorefrontCatalogFacets;
  total?: number;
}): React.JSX.Element {
  const { params, setParam, setParams } = useCatalogParams();
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const size = params.get('size') ?? '';
  const search = params.get('search') ?? '';
  const sort = params.get('sort') ?? 'featured';
  const activeCount = (size ? 1 : 0) + (search ? 1 : 0);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 border-y border-white/[0.08] py-3">
        <button
          type="button"
          className="chip cursor-pointer lg:hidden"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filter
          {activeCount ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[hsl(var(--accent))] px-1 text-[11px] font-bold text-white">
              {activeCount}
            </span>
          ) : null}
        </button>

        {facets.sizes.length ? (
          <div className="hidden min-w-0 flex-1 items-center gap-2 lg:flex" role="group" aria-label="Size">
            <span className="text-micro mr-1 text-muted-foreground">Size</span>
            <div className="rail-scroll flex gap-2 overflow-x-auto">
              <SizeChips sizes={facets.sizes} active={size} onPick={(value) => setParam('size', value)} />
            </div>
          </div>
        ) : (
          <div className="hidden flex-1 lg:block" />
        )}

        {typeof total === 'number' ? (
          <p className="tabular ml-auto text-sm text-muted-foreground lg:ml-0">
            {total} {total === 1 ? 'kit' : 'kits'}
          </p>
        ) : null}

        <label className="ml-auto flex shrink-0 items-center gap-2 text-sm lg:ml-4">
          <span className="sr-only sm:not-sr-only sm:text-muted-foreground">Sort</span>
          <select
            className="field h-9 w-auto min-w-[9.5rem] cursor-pointer rounded-full py-0 text-sm"
            value={sort}
            onChange={(event) => setParam('sort', event.target.value)}
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {activeCount ? (
        <div className="flex flex-wrap items-center gap-2">
          {search ? (
            <button type="button" className="chip cursor-pointer" onClick={() => setParam('search', '')}>
              “{search}”
              <X className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Remove search filter</span>
            </button>
          ) : null}
          {size ? (
            <button type="button" className="chip cursor-pointer" onClick={() => setParam('size', '')}>
              Size {size}
              <X className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Remove size filter</span>
            </button>
          ) : null}
          <button
            type="button"
            className="cursor-pointer px-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={() => setParams({ size: '', search: '' })}
          >
            Clear all
          </button>
        </div>
      ) : null}

      <AnimatePresence>
        {open ? (
          <motion.div
            key="filter-sheet"
            className="fixed inset-0 z-[120] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MOTION_TRANSITION}
          >
            <button type="button" className="absolute inset-0 cursor-pointer bg-black/70" aria-label="Close filters" onClick={() => setOpen(false)} />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
              className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[hsl(var(--surface-2))] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3"
              initial={reduced ? { opacity: 0 } : { y: '100%' }}
              animate={reduced ? { opacity: 1 } : { y: 0 }}
              exit={reduced ? { opacity: 0 } : { y: '100%' }}
              transition={reduced ? MOTION_TRANSITION : MOTION_DRAWER}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" aria-hidden />
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-2xl uppercase">Filter</h2>
                <button type="button" className="icon-btn cursor-pointer" aria-label="Close" onClick={() => setOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              {facets.sizes.length ? (
                <div className="mt-6">
                  <p className="text-micro text-muted-foreground">Size</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <SizeChips sizes={facets.sizes} active={size} onPick={(value) => setParam('size', value)} />
                  </div>
                </div>
              ) : null}
              <div className="mt-6">
                <p className="text-micro text-muted-foreground">Sort by</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SORTS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className="chip cursor-pointer"
                      aria-pressed={sort === option.value}
                      onClick={() => setParam('sort', option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="btn btn-secondary cursor-pointer"
                  disabled={!size}
                  onClick={() => setParam('size', '')}
                >
                  Clear size
                </button>
                <button type="button" className="btn btn-primary cursor-pointer" onClick={() => setOpen(false)}>
                  {typeof total === 'number' ? `Show ${total}` : 'Done'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
