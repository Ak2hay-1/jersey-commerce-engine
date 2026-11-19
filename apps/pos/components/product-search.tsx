'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Badge, Button, Input } from '@jersey-commerce/ui';
import type { PosLookupItem } from '@jersey-commerce/types';
import { ScanLine } from 'lucide-react';
import { CameraScanner } from '@/components/camera-scanner';
import { formatMoney, statusLabel } from '@/lib/format';
import { lookupProducts } from '@/lib/pos-api';
import { useRealtimeReload } from '@/lib/realtime';
import { resolveScan } from '@/lib/resolve-scan';

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
  const [scannerOpen, setScannerOpen] = useState(false);

  const scanQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!busy && !scannerOpen) {
      const active = document.activeElement;
      if (!active || active === document.body) {
        inputRef.current?.focus();
      }
    }
  }, [busy, scannerOpen]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) {
        return;
      }
      const active = document.activeElement;
      if (active && active !== document.body) {
        return;
      }
      if (document.querySelector('[role="dialog"]')) {
        return;
      }
      inputRef.current?.focus();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
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

  async function addItem(item: PosLookupItem, scannedValue?: string): Promise<void> {
    setAddingId(item.variant.id);
    setError('');
    try {
      await onAdd(item);
      setQuery((current) => (scannedValue === undefined || current.trim() === scannedValue ? '' : current));
      setResults([]);
      if (!scannerOpen) {
        inputRef.current?.focus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add item');
    } finally {
      setAddingId('');
    }
  }

  function onSubmit(event: FormEvent): void {
    event.preventDefault();
    const value = query.trim();
    if (!value) {
      return;
    }
    // Scanners fire Enter quickly; run lookups one at a time so no scan is lost or reordered.
    scanQueue.current = scanQueue.current.then(() => lookupAndAdd(value));
  }

  async function lookupAndAdd(value: string): Promise<void> {
    setSearching(true);
    setError('');
    try {
      const items = await resolveScan(value);
      setResults(items);
      if (items.length === 1) {
        await addItem(items[0]!, value);
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
        <form onSubmit={onSubmit} className="flex items-stretch gap-2">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Scan barcode or search name / SKU"
            autoComplete="off"
            className="h-14 min-w-0 flex-1 rounded-xl border-border/80 bg-background text-base shadow-inner"
            aria-busy={busy || searching}
          />
          <Button
            type="button"
            className="h-14 shrink-0 gap-2 rounded-xl px-4 text-base font-semibold sm:px-5"
            aria-label="Scan with camera"
            onClick={() => setScannerOpen(true)}
          >
            <ScanLine className="h-5 w-5" />
            <span>Scan</span>
          </Button>
        </form>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        {searching ? <p className="mt-3 text-sm text-muted-foreground">Searching…</p> : null}
      </section>

      {!query.trim() && !searching ? (
        <div className="rounded-2xl border border-dashed bg-card/70 px-6 py-14 text-center">
          <p className="text-base font-medium">Ready for the next sale</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap Scan to use the phone camera, or type a club name / SKU to add a jersey to the cart.
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

      <CameraScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onAdd={onAdd} busy={busy} />
    </div>
  );
}
