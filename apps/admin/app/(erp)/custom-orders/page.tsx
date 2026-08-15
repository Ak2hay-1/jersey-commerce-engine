'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@jersey-commerce/ui';
import { ResourceList } from '@/components/resource-list';
import { formatDateTime, formatMoney, statusLabel } from '@/lib/format';

interface CustomOrderRow {
  id: string;
  orderNumber: string;
  status: string;
  customer: { name: string };
  total: string;
  balanceDue: string;
  createdAt: string;
}

function CustomOrdersList(): React.JSX.Element {
  const params = useSearchParams();
  const status = params.get('status') ?? undefined;
  const title =
    status === 'INQUIRY' ? 'Enquiries' : status === 'QUOTATION' ? 'Quotes' : status === 'PRODUCTION' ? 'Production' : 'Custom orders';
  return (
    <ResourceList<CustomOrderRow>
      title={title}
      path="/custom-orders"
      extraQuery={status ? { status } : undefined}
      rowHref={(row) => `/custom-orders/${row.id}`}
      columns={[
        { key: 'no', header: 'Order', render: (row) => row.orderNumber },
        { key: 'cust', header: 'Customer', render: (row) => row.customer.name },
        { key: 'st', header: 'Status', render: (row) => <Badge variant="secondary">{statusLabel(row.status)}</Badge> },
        { key: 'amt', header: 'Total', render: (row) => formatMoney(row.total) },
        { key: 'due', header: 'Balance', hideOnMobile: true, render: (row) => formatMoney(row.balanceDue) },
        { key: 'dt', header: 'Date', hideOnMobile: true, render: (row) => formatDateTime(row.createdAt) },
      ]}
    />
  );
}

export default function CustomOrdersPage(): React.JSX.Element {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading custom orders…</p>}>
      <CustomOrdersList />
    </Suspense>
  );
}
