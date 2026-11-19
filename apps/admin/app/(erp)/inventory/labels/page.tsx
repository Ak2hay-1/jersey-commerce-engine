'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button, Input } from '@jersey-commerce/ui';
import type { InventoryListItem, InventoryListResult } from '@jersey-commerce/types';
import { PageHeader } from '@/components/page-header';
import { PrintQrLabelsButton } from '@/components/print-qr-labels-button';
import { apiRequest, queryString } from '@/lib/api';
import { formatMoney } from '@/lib/format';

export default function InventoryLabelsPage(): React.JSX.Element {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<InventoryListItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const handle = window.setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    void apiRequest<InventoryListResult>(
      `/inventory${queryString({ page: 1, pageSize: 100, search: search || undefined, sort: 'sku' })}`,
    )
      .then((result) => {
        if (cancelled) {
          return;
        }
        setRows(result.items ?? []);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [search]);

  const selectedItems = useMemo(
    () =>
      rows
        .filter((row) => selected[row.productVariantId])
        .map((row) => ({
          sku: row.sku,
          productName: row.productName,
          size: row.size,
          colour: row.colour,
          sellingPrice: row.sellingPrice,
        })),
    [rows, selected],
  );

  const allSelected = rows.length > 0 && rows.every((row) => selected[row.productVariantId]);

  function toggleAll(next: boolean): void {
    setSelected((current) => {
      const copy = { ...current };
      for (const row of rows) {
        copy[row.productVariantId] = next;
      }
      return copy;
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Print QR labels"
        description="Select variants, then print a sheet of labels. Each QR encodes the variant SKU for POS camera scanning."
        actions={
          <div className="flex flex-wrap items-start gap-2">
            <Button asChild variant="outline">
              <Link href="/inventory">Back to stock</Link>
            </Button>
            <PrintQrLabelsButton items={selectedItems} label={`Print ${selectedItems.length || ''} labels`.trim()} />
          </div>
        }
      />
      <Input
        aria-label="Search variants"
        placeholder="Search product, SKU, or size"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        className="max-w-sm rounded-full"
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">
                <input
                  type="checkbox"
                  aria-label="Select all on page"
                  checked={allSelected}
                  onChange={(event) => toggleAll(event.target.checked)}
                />
              </th>
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 font-medium">Size</th>
              <th className="px-3 py-2 font-medium">SKU</th>
              <th className="px-3 py-2 font-medium">Price</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-muted-foreground">
                  Loading variants…
                </td>
              </tr>
            ) : null}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-muted-foreground">
                  No variants match this search.
                </td>
              </tr>
            ) : null}
            {rows.map((row) => (
              <tr key={row.productVariantId} className="border-b last:border-0">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label={`Select ${row.sku}`}
                    checked={Boolean(selected[row.productVariantId])}
                    onChange={(event) =>
                      setSelected((current) => ({ ...current, [row.productVariantId]: event.target.checked }))
                    }
                  />
                </td>
                <td className="px-3 py-2">{row.productName}</td>
                <td className="px-3 py-2">{row.variantLabel || '—'}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.sku}</td>
                <td className="px-3 py-2">{formatMoney(row.sellingPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Showing up to 100 matching variants. Narrow the search to find a specific SKU.</p>
    </div>
  );
}
