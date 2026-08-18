'use client';

import { useState } from 'react';
import { Badge } from '@jersey-commerce/ui';
import type { PosSaleDto } from '@jersey-commerce/types';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { formatDateTime, formatMoney, statusLabel } from '@/lib/format';
import { queryString } from '@/lib/api';
import { usePagedResource } from '@/lib/use-paged-resource';

export default function SalesPage(): React.JSX.Element {
  const [page, setPage] = useState(1);
  const { data, loading, error } = usePagedResource<PosSaleDto>(`/pos/sales${queryString({ page, pageSize: 20 })}`);

  return (
    <div className="space-y-4">
      <PageHeader title="Sales" description="Register sales for this cashier. Owners and managers see the tenant." />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <DataTable
        caption="POS sales"
        loading={loading}
        rows={data?.items ?? []}
        rowHref={(row) => `/sales/${row.id}`}
        page={page}
        totalPages={data?.meta.totalPages ?? 1}
        onPageChange={setPage}
        columns={[
          { key: 'inv', header: 'Invoice', render: (row) => row.invoiceNumber },
          { key: 'cust', header: 'Customer', render: (row) => row.customer?.name ?? 'Walk-in' },
          { key: 'amt', header: 'Amount', render: (row) => formatMoney(row.total) },
          {
            key: 'pay',
            header: 'Payment',
            hideOnMobile: true,
            render: (row) => row.payments.map((payment) => payment.method).join(', ') || '—',
          },
          {
            key: 'st',
            header: 'Status',
            render: (row) => <Badge variant="secondary">{statusLabel(row.status)}</Badge>,
          },
          { key: 'dt', header: 'Date', hideOnMobile: true, render: (row) => formatDateTime(row.createdAt) },
        ]}
      />
    </div>
  );
}
