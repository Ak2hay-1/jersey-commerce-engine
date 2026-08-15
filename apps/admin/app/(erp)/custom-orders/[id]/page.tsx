'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge } from '@jersey-commerce/ui';
import { apiRequest } from '@/lib/api';
import { formatMoney, statusLabel } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';

interface CustomOrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  type: string;
  total: string;
  depositPaid: string;
  balanceDue: string;
  customer: { name: string };
  items: Array<{ id: string; playerName: string | null; size: string | null; quantity: number; total: string }>;
}

export default function CustomOrderDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const [row, setRow] = useState<CustomOrderDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    apiRequest<CustomOrderDetail>(`/custom-orders/${params.id}`).then(setRow).catch((err: Error) => setError(err.message));
  }, [params.id]);
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!row) return <p className="text-sm text-muted-foreground">Loading custom order…</p>;
  return (
    <div className="space-y-4">
      <PageHeader title={row.orderNumber} description={`${row.customer.name} · ${row.type}`} actions={<Badge variant="secondary">{statusLabel(row.status)}</Badge>} />
      <p className="text-sm">Total {formatMoney(row.total)} · Deposit {formatMoney(row.depositPaid)} · Balance {formatMoney(row.balanceDue)}</p>
      <DataTable
        caption="Custom order items"
        rows={row.items}
        columns={[
          { key: 'player', header: 'Player', render: (item) => item.playerName ?? '—' },
          { key: 'size', header: 'Size', render: (item) => item.size ?? '—' },
          { key: 'qty', header: 'Qty', render: (item) => item.quantity },
          { key: 'total', header: 'Total', render: (item) => formatMoney(item.total) },
        ]}
      />
    </div>
  );
}
