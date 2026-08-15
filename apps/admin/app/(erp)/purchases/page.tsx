'use client';

import { Badge } from '@jersey-commerce/ui';
import { ResourceList } from '@/components/resource-list';
import { formatDateTime, formatMoney, statusLabel } from '@/lib/format';

interface PurchaseRow {
  id: string;
  purchaseNumber: string;
  supplier?: { name: string } | null;
  status: string;
  total: string;
  createdAt: string;
}

export default function PurchasesPage(): React.JSX.Element {
  return (
    <ResourceList<PurchaseRow>
      title="Purchases"
      path="/purchases"
      rowHref={(row) => `/purchases/${row.id}`}
      columns={[
        { key: 'no', header: 'Purchase', render: (row) => row.purchaseNumber },
        { key: 'sup', header: 'Supplier', render: (row) => row.supplier?.name ?? '—' },
        { key: 'amt', header: 'Total', render: (row) => formatMoney(row.total) },
        { key: 'st', header: 'Status', render: (row) => <Badge variant="secondary">{statusLabel(row.status)}</Badge> },
        { key: 'dt', header: 'Date', hideOnMobile: true, render: (row) => formatDateTime(row.createdAt) },
      ]}
    />
  );
}
