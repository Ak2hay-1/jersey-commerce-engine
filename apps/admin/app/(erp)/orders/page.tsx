'use client';

import Link from 'next/link';
import { Badge, Button } from '@jersey-commerce/ui';
import { ResourceList } from '@/components/resource-list';
import { formatDateTime, formatMoney, statusLabel } from '@/lib/format';
import { useAuth } from '@/lib/auth';

interface OrderRow {
  id: string;
  orderNumber: string;
  customer?: { name: string } | null;
  source: string;
  total: string;
  paymentStatus: string;
  status: string;
  createdAt: string;
}

export default function OrdersPage(): React.JSX.Element {
  const auth = useAuth();
  return (
    <ResourceList<OrderRow>
      title="Orders"
      description="Website, WhatsApp, and manual orders."
      path="/orders"
      searchKey="customer"
      rowHref={(row) => `/orders/${row.id}`}
      actions={
        auth.can('orders.create') ? (
          <Button asChild>
            <Link href="/orders/new">Create order</Link>
          </Button>
        ) : null
      }
      columns={[
        { key: 'no', header: 'Order', render: (row) => row.orderNumber },
        { key: 'cust', header: 'Customer', render: (row) => row.customer?.name ?? '—' },
        { key: 'src', header: 'Source', render: (row) => row.source },
        { key: 'amt', header: 'Amount', render: (row) => formatMoney(row.total) },
        { key: 'pay', header: 'Payment', hideOnMobile: true, render: (row) => row.paymentStatus },
        { key: 'st', header: 'Status', render: (row) => <Badge variant="secondary">{statusLabel(row.status)}</Badge> },
        { key: 'dt', header: 'Date', hideOnMobile: true, render: (row) => formatDateTime(row.createdAt) },
      ]}
    />
  );
}
