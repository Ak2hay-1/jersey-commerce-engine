'use client';

import { Badge } from '@jersey-commerce/ui';
import { ResourceList } from '@/components/resource-list';
import { formatDateTime, formatMoney, statusLabel } from '@/lib/format';

interface SaleRow {
  id: string;
  invoiceNumber: string;
  customer?: { name: string } | null;
  cashier?: { name: string } | null;
  total: string;
  status: string;
  createdAt: string;
  payments?: Array<{ method: string }>;
  ecommerceOrder?: { source: string } | null;
}

export default function SalesPage(): React.JSX.Element {
  return (
    <ResourceList<SaleRow>
      title="POS sales"
      description="Completed register sales. Click a row for the invoice detail."
      path="/sales"
      rowHref={(row) => `/sales/${row.id}`}
      columns={[
        { key: 'inv', header: 'Invoice', render: (row) => row.invoiceNumber },
        { key: 'cust', header: 'Customer', render: (row) => row.customer?.name ?? 'Walk-in' },
        { key: 'cash', header: 'Cashier', hideOnMobile: true, render: (row) => row.cashier?.name ?? '—' },
        { key: 'src', header: 'Source', render: (row) => row.ecommerceOrder?.source ?? 'POS' },
        { key: 'amt', header: 'Amount', render: (row) => formatMoney(row.total) },
        { key: 'pay', header: 'Payment', hideOnMobile: true, render: (row) => row.payments?.[0]?.method ?? '—' },
        { key: 'st', header: 'Status', render: (row) => <Badge variant="secondary">{statusLabel(row.status)}</Badge> },
        { key: 'dt', header: 'Date', hideOnMobile: true, render: (row) => formatDateTime(row.createdAt) },
      ]}
    />
  );
}
