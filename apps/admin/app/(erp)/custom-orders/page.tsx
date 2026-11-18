'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Badge, Button, cn } from '@jersey-commerce/ui';
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

const STATUS_FILTERS = [
  { label: 'All', href: '/custom-orders' },
  { label: 'Enquiries', href: '/custom-orders?status=INQUIRY' },
  { label: 'Quotes', href: '/custom-orders?status=QUOTATION' },
  { label: 'Production', href: '/custom-orders?status=PRODUCTION' },
  { label: 'Wholesale', href: '/custom-orders?type=WHOLESALE_ORDER' },
] as const;

function filterActive(href: string, status: string | undefined, type: string | undefined): boolean {
  if (href === '/custom-orders') {
    return !status && !type;
  }
  const query = href.split('?')[1] ?? '';
  const params = new URLSearchParams(query);
  const wantStatus = params.get('status');
  const wantType = params.get('type');
  if (wantStatus) {
    return status === wantStatus && !type;
  }
  if (wantType) {
    return type === wantType && !status;
  }
  return false;
}

function CustomOrdersList(): React.JSX.Element {
  const params = useSearchParams();
  const auth = useAuth();
  const status = params.get('status') ?? undefined;
  const type = params.get('type') ?? undefined;
  const isEnquiryList = status === 'INQUIRY';
  const isWholesaleList = type === 'WHOLESALE_ORDER';
  const title = isWholesaleList
    ? 'Wholesale'
    : status === 'INQUIRY'
      ? 'Enquiries'
      : status === 'QUOTATION'
        ? 'Quotes'
        : status === 'PRODUCTION'
          ? 'Production'
          : 'Custom orders';
  const extraQuery = status || type ? { ...(status ? { status } : {}), ...(type ? { type } : {}) } : undefined;
  const filters = (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Custom order filters">
      {STATUS_FILTERS.map((filter) => {
        const active = filterActive(filter.href, status, type);
        return (
          <Link
            key={filter.href}
            href={filter.href}
            role="tab"
            aria-selected={active}
            className={cn(
              'inline-flex cursor-pointer items-center rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-[hsl(var(--erp-lime))] text-[hsl(var(--erp-lime-foreground))]'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
            )}
          >
            {filter.label}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      {filters}
      <ResourceList<CustomOrderRow>
        title={title}
        description={
          isWholesaleList
            ? 'Wholesale and resale enquiries from the storefront Wholesale page.'
            : isEnquiryList
              ? 'Guest and staff custom-jersey enquiries awaiting a quote.'
              : undefined
        }
        path="/custom-orders"
        extraQuery={extraQuery}
        empty={isWholesaleList ? 'No wholesale enquiries yet.' : isEnquiryList ? 'No enquiries yet.' : 'No custom orders found.'}
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
    </div>
  );
}

export default function CustomOrdersPage(): React.JSX.Element {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading custom orders…</p>}>
      <CustomOrdersList />
    </Suspense>
  );
}
