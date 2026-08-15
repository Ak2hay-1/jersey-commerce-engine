'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge } from '@jersey-commerce/ui';
import { apiRequest } from '@/lib/api';
import { formatDateTime, formatMoney, statusLabel } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';

interface OrderDetail {
  id: string;
  orderNumber: string;
  source: string;
  status: string;
  paymentStatus: string;
  total: string;
  createdAt: string;
  customer?: { name: string } | null;
  items: Array<{ id: string; productNameSnapshot: string; quantity: number; total: string }>;
}

export default function OrderDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    apiRequest<OrderDetail>(`/orders/${params.id}`).then(setOrder).catch((err: Error) => setError(err.message));
  }, [params.id]);
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!order) return <p className="text-sm text-muted-foreground">Loading order…</p>;
  return (
    <div className="space-y-4">
      <PageHeader
        title={order.orderNumber}
        description={`${order.source} · ${order.customer?.name ?? 'Guest'} · ${formatDateTime(order.createdAt)}`}
        actions={<Badge variant="secondary">{statusLabel(order.status)}</Badge>}
      />
      <p className="text-sm">Payment {order.paymentStatus} · Total {formatMoney(order.total)}</p>
      <DataTable
        caption="Order items"
        rows={order.items}
        columns={[
          { key: 'name', header: 'Item', render: (row) => row.productNameSnapshot },
          { key: 'qty', header: 'Qty', render: (row) => row.quantity },
          { key: 'total', header: 'Total', render: (row) => formatMoney(row.total) },
        ]}
      />
    </div>
  );
}
