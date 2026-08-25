'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge, Button, Card, CardContent, Input, Label } from '@jersey-commerce/ui';
import type { ProductListItem } from '@jersey-commerce/types';
import { apiRequest, queryString } from '@/lib/api';
import { formatDateTime, formatMoney, statusLabel } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { ConfirmAction, FormError, selectClassName } from '@/components/confirm-action';
import { useAuth } from '@/lib/auth';

interface SupplierRow {
  id: string;
  name: string;
}

interface PurchaseDetail {
  id: string;
  purchaseNumber: string;
  status: string;
  total: string;
  notes?: string | null;
  createdAt: string;
  supplier?: { id?: string; name: string } | null;
  items: Array<{
    id: string;
    productVariantId: string;
    sku?: string;
    orderedQuantity: number;
    receivedQuantity: number;
    unitCost: string;
    total: string;
    productName?: string;
  }>;
}

interface LineDraft {
  productVariantId: string;
  orderedQuantity: string;
  unitCost: string;
  receivedQuantity: string;
}

interface VariantOption {
  id: string;
  label: string;
}

export default function PurchaseDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const isNew = params.id === 'new';
  const router = useRouter();
  const auth = useAuth();
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [row, setRow] = useState<PurchaseDetail | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([{ productVariantId: '', orderedQuantity: '1', unitCost: '0', receivedQuantity: '0' }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load(): Promise<void> {
    const next = await apiRequest<PurchaseDetail>(`/purchases/${params.id}`);
    setRow(next);
    setSupplierId(next.supplier?.id ?? '');
    setNotes(next.notes ?? '');
    setLines(
      next.items.map((item) => ({
        productVariantId: item.productVariantId,
        orderedQuantity: String(item.orderedQuantity),
        unitCost: item.unitCost,
        receivedQuantity: String(item.receivedQuantity),
      })),
    );
  }

  useEffect(() => {
    void apiRequest<{ items: SupplierRow[] } | SupplierRow[]>(`/suppliers${queryString({ page: 1, pageSize: 100 })}`).then(
      (result) => setSuppliers(Array.isArray(result) ? result : (result.items ?? [])),
    );
    void apiRequest<{ items: ProductListItem[] } | ProductListItem[]>(
      `/products${queryString({ page: 1, pageSize: 100, status: 'ACTIVE' })}`,
    ).then(async (result) => {
      const products = Array.isArray(result) ? result : (result.items ?? []);
      const options: VariantOption[] = [];
      for (const product of products.slice(0, 40)) {
        try {
          const detail = await apiRequest<{
            name: string;
            variants: Array<{ id: string; sku: string; size: string | null; colour: string | null }>;
          }>(`/products/${product.id}`);
          for (const variant of detail.variants) {
            options.push({
              id: variant.id,
              label: `${detail.name} · ${variant.size ?? '—'} ${variant.colour ?? ''} (${variant.sku})`.trim(),
            });
          }
        } catch {
          /* skip */
        }
      }
      setVariants(options);
    });
    if (!isNew) {
      load().catch((err: Error) => setError(err.message));
    }
  }, [isNew, params.id]);

  const draftable = isNew || row?.status === 'DRAFT';

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!supplierId || lines.some((line) => !line.productVariantId)) {
      setError('Supplier and at least one variant line are required.');
      return;
    }
    setSaving(true);
    setError('');
    const body = {
      supplierId,
      notes: notes.trim() || undefined,
      items: lines.map((line) => ({
        productVariantId: line.productVariantId,
        orderedQuantity: Number(line.orderedQuantity),
        unitCost: line.unitCost,
      })),
    };
    try {
      if (isNew) {
        const created = await apiRequest<PurchaseDetail>('/purchases', { method: 'POST', body: JSON.stringify(body) });
        router.replace(`/purchases/${created.id}`);
      } else {
        await apiRequest(`/purchases/${params.id}`, { method: 'PATCH', body: JSON.stringify(body) });
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save purchase');
    } finally {
      setSaving(false);
    }
  }

  async function markOrdered(): Promise<void> {
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/purchases/${params.id}/order`, { method: 'POST' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to mark ordered');
    } finally {
      setSaving(false);
    }
  }

  async function receive(): Promise<void> {
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/purchases/${params.id}/receive`, {
        method: 'POST',
        body: JSON.stringify({
          items: lines.map((line) => ({
            productVariantId: line.productVariantId,
            receivedQuantity: Number(line.receivedQuantity || line.orderedQuantity),
          })),
          reason: 'Goods received',
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to receive purchase');
    } finally {
      setSaving(false);
    }
  }

  async function cancel(reason: string): Promise<void> {
    setSaving(true);
    try {
      await apiRequest(`/purchases/${params.id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel');
      throw err;
    } finally {
      setSaving(false);
    }
  }

  const title = useMemo(() => (isNew ? 'New purchase' : row?.purchaseNumber ?? 'Purchase'), [isNew, row?.purchaseNumber]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        description={row ? `${row.supplier?.name ?? ''} · ${formatDateTime(row.createdAt)}` : 'Draft a PO, mark ordered, then receive to add stock.'}
        actions={row ? <Badge variant="secondary">{statusLabel(row.status)}</Badge> : undefined}
      />
      <FormError>{error}</FormError>
      <Card>
        <CardContent className="p-4">
          <form className="grid gap-3" onSubmit={(event) => void onSubmit(event)}>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="supplier">Supplier</Label>
                <select
                  id="supplier"
                  className={selectClassName}
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  required
                  disabled={!draftable}
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!draftable} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Lines</p>
                {draftable ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setLines((current) => [...current, { productVariantId: '', orderedQuantity: '1', unitCost: '0', receivedQuantity: '0' }])
                    }
                  >
                    Add line
                  </Button>
                ) : null}
              </div>
              {lines.map((line, index) => (
                <div key={index} className="grid gap-2 md:grid-cols-4">
                  <select
                    className={selectClassName}
                    value={line.productVariantId}
                    disabled={!draftable}
                    onChange={(e) =>
                      setLines((current) => current.map((row, i) => (i === index ? { ...row, productVariantId: e.target.value } : row)))
                    }
                    required
                  >
                    <option value="">Variant</option>
                    {variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="Ordered qty"
                    value={line.orderedQuantity}
                    disabled={!draftable}
                    onChange={(e) =>
                      setLines((current) => current.map((row, i) => (i === index ? { ...row, orderedQuantity: e.target.value } : row)))
                    }
                  />
                  <Input
                    placeholder="Unit cost"
                    value={line.unitCost}
                    disabled={!draftable}
                    onChange={(e) =>
                      setLines((current) => current.map((row, i) => (i === index ? { ...row, unitCost: e.target.value } : row)))
                    }
                  />
                  <Input
                    placeholder="Receive qty"
                    value={line.receivedQuantity}
                    disabled={draftable}
                    onChange={(e) =>
                      setLines((current) => current.map((row, i) => (i === index ? { ...row, receivedQuantity: e.target.value } : row)))
                    }
                  />
                </div>
              ))}
            </div>
            {draftable && ((isNew && auth.can('purchases.create')) || (!isNew && auth.can('purchases.update'))) ? (
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save draft'}
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>

      {!isNew && row ? (
        <div className="flex flex-wrap gap-2">
          {row.status === 'DRAFT' && auth.can('purchases.update') ? (
            <Button type="button" disabled={saving} onClick={() => void markOrdered()}>
              Mark ordered
            </Button>
          ) : null}
          {(row.status === 'ORDERED' || row.status === 'PARTIALLY_RECEIVED') && auth.can('purchases.receive') ? (
            <Button type="button" disabled={saving} onClick={() => void receive()}>
              Receive stock
            </Button>
          ) : null}
          {row.status !== 'CANCELLED' && row.status !== 'RECEIVED' && auth.can('purchases.cancel') ? (
            <ConfirmAction
              triggerLabel="Cancel purchase"
              title="Cancel this purchase?"
              description="Cancelled POs cannot be received."
              requireReason
              confirmLabel="Cancel purchase"
              disabled={saving}
              onConfirm={(reason) => cancel(reason)}
            />
          ) : null}
        </div>
      ) : null}

      {!isNew && row ? (
        <DataTable
          caption="Purchase items"
          rows={row.items}
          columns={[
            { key: 'sku', header: 'SKU', render: (item) => item.sku ?? item.productName ?? item.id },
            { key: 'ord', header: 'Ordered', render: (item) => item.orderedQuantity },
            { key: 'rec', header: 'Received', render: (item) => item.receivedQuantity },
            { key: 'cost', header: 'Unit cost', render: (item) => formatMoney(item.unitCost) },
            { key: 'total', header: 'Total', render: (item) => formatMoney(item.total) },
          ]}
        />
      ) : null}
    </div>
  );
}
