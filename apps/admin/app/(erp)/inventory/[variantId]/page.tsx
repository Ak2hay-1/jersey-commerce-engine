'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest, queryString } from '@/lib/api';
import { formatDateTime, formatMoney, statusLabel } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { usePagedResource } from '@/lib/use-paged-resource';

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
  const params = useParams<{ variantId: string }>();
  const [detail, setDetail] = useState<InventoryDetail | null>(null);
  const [error, setError] = useState('');
  const movements = usePagedResource<MovementRow>(`/inventory/${params.variantId}/movements${queryString({ pageSize: 20 })}`);

  useEffect(() => {
    apiRequest<InventoryDetail>(`/inventory/${params.variantId}`)
      .then(setDetail)
      .catch((err: Error) => setError(err.message));
  }, [params.variantId]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!detail) return <p className="text-sm text-muted-foreground">Loading inventory…</p>;

  return (
    <div className="space-y-4">
      <PageHeader title={`${detail.productName} / ${detail.variantLabel}`} description={detail.sku} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <p>On hand {detail.quantity}</p>
        <p>Reserved {detail.reservedQuantity}</p>
        <p>Available {detail.availableQuantity}</p>
        <p>Reorder {detail.reorderLevel}</p>
        <p>Cost {formatMoney(detail.costPrice)}</p>
        <p>Selling {formatMoney(detail.sellingPrice)}</p>
        <p>Status {statusLabel(detail.stockStatus)}</p>
      </div>
      <DataTable
        caption="Movements"
        loading={movements.loading}
        rows={movements.data?.items ?? []}
        columns={[
          { key: 'date', header: 'Date', render: (row) => formatDateTime(row.date || row.id) },
          { key: 'type', header: 'Type', render: (row) => row.type },
          { key: 'qty', header: 'Qty', render: (row) => row.quantity },
          { key: 'reason', header: 'Reason', hideOnMobile: true, render: (row) => row.reason ?? '—' },
        ]}
      />
    </div>
  );
}
