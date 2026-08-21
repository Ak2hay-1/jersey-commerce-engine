'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Badge, Button, Input } from '@jersey-commerce/ui';
import type { PosLookupItem } from '@jersey-commerce/types';
import { formatMoney, statusLabel } from '@/lib/format';
import { lookupBarcode, lookupProducts } from '@/lib/pos-api';
import { useRealtimeReload } from '@/lib/realtime';

function variantLabel(item: PosLookupItem): string {
  return [item.variant.size, item.variant.colour].filter(Boolean).join(' · ') || item.variant.sku;
}

export function ProductSearch({
  onAdd,
  busy,
}: {
  onAdd: (item: PosLookupItem) => Promise<void>;
  busy?: boolean;
}): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PosLookupItem[]>([]);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState('');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const value = query.trim();
    if (!value) {
      setResults([]);
      return;
    }
    const handle = window.setTimeout(() => {
      setSearching(true);
      void lookupProducts({ q: value, limit: 24 })
        .then((payload) => {
          setResults(payload.items);
          setError('');
        })
        .catch((err: Error) => setError(err.message))
        .finally(() => setSearching(false));
    }, 220);
    return () => window.clearTimeout(handle);
  }, [query]);

  useRealtimeReload(
    (event) =>
      Boolean(query.trim()) &&
      (event.entity === 'Inventory' || event.entity === 'Product' || event.entity === 'ProductVariant'),
    () => {
      const value = query.trim();
      if (!value) {
        return;
      }
      setSearching(true);
      void lookupProducts({ q: value, limit: 24 })
        .then((payload) => {
          setResults(payload.items);
          setError('');
        })
        .catch((err: Error) => setError(err.message))
        .finally(() => setSearching(false));
    },
  );

  async function addItem(item: PosLookupItem): Promise<void> {
    setAddingId(item.variant.id);
    setError('');
    try {
      await onAdd(item);
      setQuery('');
      setResults([]);
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add item');
    } finally {
      setAddingId('');
    }
  }

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const value = query.trim();
    if (!value) {
      return;
    }
    setSearching(true);
    setError('');
    try {
      const scanned = await lookupBarcode(value);
      if (scanned) {
        await addItem(scanned);
        return;
      }
      const payload = await lookupProducts({ q: value, limit: 24 });
      setResults(payload.items);
      if (payload.items.length === 1) {
        await addItem(payload.items[0]!);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="pos-search-shell rounded-2xl p-4">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Catalog</p>
            <h2 className="text-lg font-semibold tracking-tight">Find a jersey</h2>
            <p className="text-sm text-muted-foreground">Scan a barcode or search by name, SKU, or size.</p>
          </div>
          <p className="hidden text-xs text-muted-foreground sm:block">Enter adds a single match</p>
        </div>
        <form onSubmit={(event) => void onSubmit(event)}>
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Scan barcode or search name / SKU"
            autoComplete="off"
            className="h-14 rounded-xl border-border/80 bg-background text-base shadow-inner"
            disabled={busy}
          />
        </form>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        {searching ? <p className="mt-3 text-sm text-muted-foreground">Searching…</p> : null}
      </section>

      {!query.trim() && !searching ? (
        <div className="rounded-2xl border border-dashed bg-card/70 px-6 py-14 text-center">
          <p className="text-base font-medium">Ready for the next sale</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Start typing a club or national jersey name, or scan a barcode to add it to the cart.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {results.map((item) => {
          const out = item.stockStatus === 'OUT_OF_STOCK';
          return (
            <button
              key={item.variant.id}
              type="button"
              className="pos-product-tile rounded-2xl p-4 text-left disabled:cursor-not-allowed disabled:opacity-60"
              disabled={out || busy || addingId === item.variant.id}
              onClick={() => void addItem(item)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold tracking-tight">{item.product.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {variantLabel(item)} · {item.variant.sku}
                  </p>
                </div>
                <Badge variant={out ? 'outline' : 'secondary'}>{statusLabel(item.stockStatus)}</Badge>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <p className="text-base font-semibold">{formatMoney(item.variant.sellingPrice)}</p>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {addingId === item.variant.id ? 'Adding…' : out ? 'Out of stock' : 'Tap to add'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {!searching && query.trim() && results.length === 0 ? (
        <p className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">No matching jerseys.</p>
      ) : null}
    </div>
  );
}
