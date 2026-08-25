'use client';

import Link from 'next/link';
import { Badge, Button } from '@jersey-commerce/ui';
import { ResourceList } from '@/components/resource-list';
import { formatDateTime, formatMoney, statusLabel } from '@/lib/format';
import { useAuth } from '@/lib/auth';

interface PurchaseRow {
  id: string;
  purchaseNumber: string;
  supplier?: { name: string } | null;
  status: string;
  total: string;
  createdAt: string;
}

export default function PurchasesPage(): React.JSX.Element {
  const auth = useAuth();
  return (
    <ResourceList<PurchaseRow>
      title="Purchases"
      description="Draft → order → receive stock. Prefer Receive over inventory adjust for PO goods."
      path="/purchases"
      rowHref={(row) => `/purchases/${row.id}`}
      actions={
        auth.can('purchases.create') ? (
          <Button asChild>
            <Link href="/purchases/new">New purchase</Link>
          </Button>
        ) : null
      }
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
