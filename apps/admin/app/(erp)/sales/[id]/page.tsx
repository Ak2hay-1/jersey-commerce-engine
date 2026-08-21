'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@jersey-commerce/ui';
import { apiRequest } from '@/lib/api';
import { formatDateTime, formatMoney, statusLabel } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { useRealtimeReload } from '@/lib/realtime';

interface SaleDetail {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  notes: string | null;
  createdAt: string;
  customer?: { name: string; phone: string | null } | null;
  cashier?: { name: string } | null;
  items: Array<{ id: string; productName: string; sku: string; quantity: number; unitPrice: string; total: string }>;
  payments: Array<{ id: string; method: string; amount: string; status: string }>;
}

export default function SaleDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    return apiRequest<SaleDetail>(`/sales/${params.id}`)
      .then(setSale)
      .catch((err: Error) => setError(err.message));
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeReload(
    (event) =>
      (event.entity === 'Sale' || event.entity === 'Payment') &&
      (event.entityId === params.id || event.entity === 'Payment'),
    () => load(),
  );

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!sale) {
    return <p className="text-sm text-muted-foreground">Loading sale…</p>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={sale.invoiceNumber}
        description={`${sale.customer?.name ?? 'Walk-in'} · ${formatDateTime(sale.createdAt)}`}
        actions={<Badge variant="secondary">{statusLabel(sale.status)}</Badge>}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="p-4"><CardTitle className="text-sm">Customer</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0 text-sm">
            <p>{sale.customer?.name ?? 'Walk-in'}</p>
            <p className="text-muted-foreground">{sale.customer?.phone ?? '—'}</p>
            <p className="mt-2">Cashier {sale.cashier?.name ?? '—'}</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader className="p-4"><CardTitle className="text-sm">Totals</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 p-4 pt-0 text-sm md:grid-cols-4">
            <div>Subtotal<br /><span className="font-medium">{formatMoney(sale.subtotal)}</span></div>
            <div>Discount<br /><span className="font-medium">{formatMoney(sale.discount)}</span></div>
            <div>Tax<br /><span className="font-medium">{formatMoney(sale.tax)}</span></div>
            <div>Total<br /><span className="font-medium">{formatMoney(sale.total)}</span></div>
          </CardContent>
        </Card>
      </div>
      <DataTable
        caption="Sale items"
        rows={sale.items}
        columns={[
          { key: 'name', header: 'Item', render: (row) => row.productName },
          { key: 'sku', header: 'SKU', hideOnMobile: true, render: (row) => row.sku },
          { key: 'qty', header: 'Qty', render: (row) => row.quantity },
          { key: 'price', header: 'Price', render: (row) => formatMoney(row.unitPrice) },
          { key: 'total', header: 'Total', render: (row) => formatMoney(row.total) },
        ]}
      />
      <DataTable
        caption="Payments"
        rows={sale.payments}
        columns={[
          { key: 'method', header: 'Method', render: (row) => row.method },
          { key: 'amt', header: 'Amount', render: (row) => formatMoney(row.amount) },
          { key: 'st', header: 'Status', render: (row) => row.status },
        ]}
      />
    </div>
  );
}
