'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, CardContent, Input, Label } from '@jersey-commerce/ui';
import type { InventoryListItem, InventoryListResult } from '@jersey-commerce/types';
import { ApiError, apiRequest, queryString } from '@/lib/api';
import { FormError } from '@/components/confirm-action';
import { useAuth } from '@/lib/auth';

type DraftMap = Record<string, string>;

async function applyTargetQty(row: InventoryListItem, target: number): Promise<void> {
  const onHand = row.quantity;
  if (target === onHand) {
    return;
  }

  const canOpen = onHand === 0 && row.reservedQuantity === 0 && target > 0;
  if (canOpen) {
    try {
      await apiRequest('/inventory/opening-stock', {
        method: 'POST',
        body: JSON.stringify({
          productVariantId: row.productVariantId,
          quantity: target,
          reason: 'Opening stock from product page',
        }),
      });
      return;
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 409) {
        throw err;
      }
      // Opening already recorded earlier — fall through to adjustment.
    }
  }

  const delta = target - onHand;
  if (delta === 0) {
    return;
  }
  await apiRequest('/inventory/adjust', {
    method: 'POST',
    body: JSON.stringify({
      productVariantId: row.productVariantId,
      quantity: delta,
      reason: 'Stock update from product page',
      type: 'ADJUSTMENT',
    }),
  });
}

export function ProductStockPanel({
  productId,
  refreshKey = 0,
}: {
  productId: string;
  /** Bump after saving variants so new SKUs appear. */
  refreshKey?: number;
}): React.JSX.Element | null {
  const auth = useAuth();
  const canRead = auth.can('inventory.read');
  const canAdjust = auth.can('inventory.adjust');
  const [rows, setRows] = useState<InventoryListItem[]>([]);
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest<InventoryListResult>(
        `/inventory${queryString({ productId, page: 1, pageSize: 100, sort: 'sku' })}`,
      );
      const items = result.items ?? [];
      setRows(items);
      setDrafts(Object.fromEntries(items.map((item) => [item.productVariantId, String(item.quantity)])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load stock');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (!canRead) {
      return;
    }
    void load();
  }, [canRead, load, refreshKey]);

  if (!canRead) {
    return null;
  }

  async function saveAll(): Promise<void> {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      for (const row of rows) {
        const raw = drafts[row.productVariantId]?.trim() ?? '';
        if (raw === '') {
          continue;
        }
        const target = Number(raw);
        if (!Number.isInteger(target) || target < 0) {
          throw new Error(`Invalid quantity for ${row.sku}. Use a whole number 0 or higher.`);
        }
        await applyTargetQty(row, target);
      }
      await load();
      setMessage('Stock saved. In-stock sizes become selectable on the storefront.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save stock');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card id="stock-by-size">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Stock by size</p>
            <p className="text-xs text-muted-foreground">
              Enter on-hand qty for each size. Zero stock greys out that size on the storefront. Opening stock is used the
              first time; later edits adjust inventory.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={loading || saving} onClick={() => void load()}>
              Refresh
            </Button>
            {canAdjust ? (
              <Button type="button" size="sm" disabled={loading || saving || rows.length === 0} onClick={() => void saveAll()}>
                {saving ? 'Saving…' : 'Save stock'}
              </Button>
            ) : null}
          </div>
        </div>
        <FormError>{error}</FormError>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        {loading && rows.length === 0 ? <p className="text-sm text-muted-foreground">Loading stock…</p> : null}
        {!loading && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Save variants first, then set opening quantities here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Size</th>
                  <th className="py-2 pr-3 font-medium">Colour</th>
                  <th className="py-2 pr-3 font-medium">SKU</th>
                  <th className="py-2 pr-3 font-medium">On hand</th>
                  <th className="py-2 pr-3 font-medium">Available</th>
                  <th className="py-2 pr-3 font-medium">Qty</th>
                  <th className="py-2 font-medium">Ledger</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const needsOpening = row.quantity === 0 && row.reservedQuantity === 0;
                  return (
                    <tr key={row.productVariantId} className="border-b last:border-0">
                      <td className="py-2 pr-3">{row.size || '—'}</td>
                      <td className="py-2 pr-3">{row.colour || '—'}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{row.sku}</td>
                      <td className="py-2 pr-3">{row.quantity}</td>
                      <td className="py-2 pr-3">{row.availableQuantity}</td>
                      <td className="py-2 pr-3">
                        {canAdjust ? (
                          <div className="space-y-1">
                            <Label htmlFor={`stock-qty-${row.productVariantId}`} className="sr-only">
                              Quantity for {row.sku}
                            </Label>
                            <Input
                              id={`stock-qty-${row.productVariantId}`}
                              className="h-9 w-24"
                              inputMode="numeric"
                              disabled={saving}
                              value={drafts[row.productVariantId] ?? ''}
                              onChange={(e) =>
                                setDrafts((current) => ({ ...current, [row.productVariantId]: e.target.value }))
                              }
                            />
                            <p className="text-[10px] text-muted-foreground">
                              {needsOpening ? 'Opening' : 'Update'}
                            </p>
                          </div>
                        ) : (
                          row.quantity
                        )}
                      </td>
                      <td className="py-2">
                        <Link className="text-xs underline" href={`/inventory/${row.productVariantId}`}>
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
