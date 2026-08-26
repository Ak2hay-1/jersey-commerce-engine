'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Button, Card, CardContent, Input, Label } from '@jersey-commerce/ui';
import { apiRequest, queryString } from '@/lib/api';
import { formatDateTime, formatMoney, statusLabel } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { FormError, selectClassName } from '@/components/confirm-action';
import { usePagedResource } from '@/lib/use-paged-resource';
import { useAuth } from '@/lib/auth';
import { useRouteParam } from '@/lib/use-route-param';

interface InventoryDetail {
  productVariantId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
  costPrice: string;
  sellingPrice: string;
  stockStatus: string;
}

interface MovementRow {
  id: string;
  date: string;
  type: string;
  quantity: number;
  reason: string | null;
  unitCost: string | null;
}

export default function InventoryDetailPage(): React.JSX.Element {
  const variantId = useRouteParam('variantId');
  const auth = useAuth();
  const [detail, setDetail] = useState<InventoryDetail | null>(null);
  const [error, setError] = useState('');
  const [openingQty, setOpeningQty] = useState('10');
  const [openingReason, setOpeningReason] = useState('Opening stock count');
  const [adjustQty, setAdjustQty] = useState('1');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustType, setAdjustType] = useState<'ADJUSTMENT' | 'DAMAGE'>('ADJUSTMENT');
  const [reorderLevel, setReorderLevel] = useState('0');
  const [saving, setSaving] = useState(false);
  const movements = usePagedResource<MovementRow>(
    `/inventory/${variantId}/movements${queryString({ pageSize: 20 })}`,
  );

  async function reload(): Promise<void> {
    const next = await apiRequest<InventoryDetail>(`/inventory/${variantId}`);
    setDetail(next);
    setReorderLevel(String(next.reorderLevel ?? 0));
  }

  useEffect(() => {
    reload().catch((err: Error) => setError(err.message));
  }, [variantId]);

  async function onOpening(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiRequest('/inventory/opening-stock', {
        method: 'POST',
        body: JSON.stringify({
          productVariantId: variantId,
          quantity: Number(openingQty),
          reason: openingReason.trim(),
          reorderLevel: Number(reorderLevel) || undefined,
        }),
      });
      await reload();
      void movements.reload(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to set opening stock');
    } finally {
      setSaving(false);
    }
  }

  async function onAdjust(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!adjustReason.trim()) {
      setError('Adjustment reason is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiRequest('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          productVariantId: variantId,
          quantity: Number(adjustQty),
          reason: adjustReason.trim(),
          type: adjustType,
        }),
      });
      setAdjustReason('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to adjust stock');
    } finally {
      setSaving(false);
    }
  }

  async function onReorder(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/inventory/${variantId}`, {
        method: 'PATCH',
        body: JSON.stringify({ reorderLevel: Number(reorderLevel) }),
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update reorder level');
    } finally {
      setSaving(false);
    }
  }

  if (!detail && !error) return <p className="text-sm text-muted-foreground">Loading inventory…</p>;
  if (!detail) return <FormError>{error}</FormError>;

  const canAdjust = auth.can('inventory.adjust');

  return (
    <div className="space-y-4">
      <PageHeader title={`${detail.productName} / ${detail.variantLabel}`} description={detail.sku} />
      <FormError>{error}</FormError>
      <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <p>On hand {detail.quantity}</p>
        <p>Reserved {detail.reservedQuantity}</p>
        <p>Available {detail.availableQuantity}</p>
        <p>Reorder {detail.reorderLevel}</p>
        <p>Cost {formatMoney(detail.costPrice)}</p>
        <p>Selling {formatMoney(detail.sellingPrice)}</p>
        <p>Status {statusLabel(detail.stockStatus)}</p>
      </div>

      {canAdjust ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-sm font-medium">Opening stock</p>
              <p className="text-xs text-muted-foreground">Use once per variant for the first count. Later corrections use Adjust.</p>
              <form className="grid gap-2" onSubmit={(event) => void onOpening(event)}>
                <div>
                  <Label htmlFor="oq">Quantity</Label>
                  <Input id="oq" className="mt-1" value={openingQty} onChange={(e) => setOpeningQty(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="or">Reason</Label>
                  <Input id="or" className="mt-1" value={openingReason} onChange={(e) => setOpeningReason(e.target.value)} required />
                </div>
                <Button type="submit" disabled={saving}>
                  Set opening stock
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-sm font-medium">Adjust stock</p>
              <form className="grid gap-2" onSubmit={(event) => void onAdjust(event)}>
                <div>
                  <Label htmlFor="aq">Signed quantity</Label>
                  <Input id="aq" className="mt-1" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="at">Type</Label>
                  <select id="at" className={selectClassName} value={adjustType} onChange={(e) => setAdjustType(e.target.value as 'ADJUSTMENT' | 'DAMAGE')}>
                    <option value="ADJUSTMENT">Adjustment</option>
                    <option value="DAMAGE">Damage (negative qty)</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="ar">Reason</Label>
                  <Input id="ar" className="mt-1" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} required />
                </div>
                <Button type="submit" disabled={saving}>
                  Apply adjustment
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-sm font-medium">Reorder level</p>
              <form className="grid gap-2" onSubmit={(event) => void onReorder(event)}>
                <div>
                  <Label htmlFor="rl">Reorder at or below</Label>
                  <Input id="rl" className="mt-1" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} required />
                </div>
                <Button type="submit" disabled={saving}>
                  Save reorder level
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <DataTable
        caption="Movements"
        rows={movements.data?.items ?? []}
        loading={movements.loading}
        page={movements.data?.meta.page ?? 1}
        totalPages={movements.data?.meta.totalPages ?? 1}
        onPageChange={() => undefined}
        columns={[
          { key: 'date', header: 'When', render: (row) => formatDateTime(row.date) },
          { key: 'type', header: 'Type', render: (row) => row.type },
          { key: 'qty', header: 'Qty', render: (row) => row.quantity },
          { key: 'reason', header: 'Reason', hideOnMobile: true, render: (row) => row.reason ?? '—' },
        ]}
      />
    </div>
  );
}
