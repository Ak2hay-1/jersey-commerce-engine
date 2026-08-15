'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge } from '@jersey-commerce/ui';
import { apiRequest } from '@/lib/api';
import { formatDateTime, formatMoney, statusLabel } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';

interface PurchaseDetail {
  id: string;
  purchaseNumber: string;
  status: string;
  total: string;
  createdAt: string;
  supplier?: { name: string } | null;
  items: Array<{ id: string; sku?: string; orderedQuantity: number; receivedQuantity: number; unitCost: string; total: string; productName?: string }>;
}

export default function PurchaseDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const [row, setRow] = useState<PurchaseDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    apiRequest<PurchaseDetail>(`/purchases/${params.id}`).then(setRow).catch((err: Error) => setError(err.message));
  }, [params.id]);
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!row) return <p className="text-sm text-muted-foreground">Loading purchase…</p>;
  return (
    <div className="space-y-4">
      <PageHeader title={row.purchaseNumber} description={`${row.supplier?.name ?? ''} · ${formatDateTime(row.createdAt)}`} actions={<Badge variant="secondary">{statusLabel(row.status)}</Badge>} />
      <p className="text-sm">Total {formatMoney(row.total)}</p>
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
    </div>
  );
}
