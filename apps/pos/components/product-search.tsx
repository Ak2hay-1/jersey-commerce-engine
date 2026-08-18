'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, CardContent, Input } from '@jersey-commerce/ui';
import type { PosLookupItem } from '@jersey-commerce/types';
import { formatMoney, statusLabel } from '@/lib/format';
import { lookupBarcode, lookupProducts } from '@/lib/pos-api';

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
    <div className="space-y-3">
      <form onSubmit={(event) => void onSubmit(event)}>
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Scan barcode or search name / SKU"
          autoComplete="off"
          className="h-12 text-base"
          disabled={busy}
        />
      </form>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {searching ? <p className="text-sm text-muted-foreground">Searching…</p> : null}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {results.map((item) => {
          const out = item.stockStatus === 'OUT_OF_STOCK';
          return (
            <Card key={item.variant.id}>
              <CardContent className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {variantLabel(item)} · {item.variant.sku}
                    </p>
                  </div>
                  <Badge variant={out ? 'outline' : 'secondary'}>{statusLabel(item.stockStatus)}</Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{formatMoney(item.variant.sellingPrice)}</p>
                  <Button
                    type="button"
                    size="sm"
                    className="h-10"
                    disabled={out || busy || addingId === item.variant.id}
                    onClick={() => void addItem(item)}
                  >
                    {addingId === item.variant.id ? 'Adding…' : 'Add'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {!searching && query.trim() && results.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matching products.</p>
      ) : null}
    </div>
  );
}
