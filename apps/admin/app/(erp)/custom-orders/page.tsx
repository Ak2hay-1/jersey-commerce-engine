'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Badge, Button } from '@jersey-commerce/ui';
import { ResourceList } from '@/components/resource-list';
import { formatDateTime, formatMoney, statusLabel } from '@/lib/format';
import { useAuth } from '@/lib/auth';

interface CustomOrderRow {
  id: string;
  orderNumber: string;
  status: string;
  type: string;
  teamName: string | null;
  estimatedQuantity: number;
  customer: { name: string };
  total: string;
  balanceDue: string;
  createdAt: string;
}

function CustomOrdersList(): React.JSX.Element {
  const params = useSearchParams();
  const auth = useAuth();
  const status = params.get('status') ?? undefined;
  const isEnquiryList = status === 'INQUIRY';
  const title =
    status === 'INQUIRY' ? 'Enquiries' : status === 'QUOTATION' ? 'Quotes' : status === 'PRODUCTION' ? 'Production' : 'Custom orders';
  return (
    <ResourceList<CustomOrderRow>
      title={title}
      description={isEnquiryList ? 'Guest and staff custom-jersey enquiries awaiting a quote.' : undefined}
      path="/custom-orders"
      extraQuery={status ? { status } : undefined}
      empty={isEnquiryList ? 'No enquiries yet.' : 'No custom orders found.'}
      rowHref={(row) => `/custom-orders/${row.id}`}
      actions={
        auth.can('customOrders.create') ? (
          <Button asChild>
            <Link href="/custom-orders/new">New enquiry</Link>
          </Button>
        ) : null
      }
      columns={[
        { key: 'no', header: 'Order', render: (row) => row.orderNumber },
        { key: 'cust', header: 'Customer', render: (row) => row.customer.name },
        { key: 'team', header: 'Team', hideOnMobile: true, render: (row) => row.teamName ?? '—' },
        { key: 'type', header: 'Type', hideOnMobile: true, render: (row) => statusLabel(row.type) },
        { key: 'qty', header: 'Qty', hideOnMobile: true, render: (row) => row.estimatedQuantity || '—' },
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
