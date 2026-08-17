'use client';

import Link from 'next/link';
import { ResourceList } from '@/components/resource-list';
import { formatDateTime, formatMoney } from '@/lib/format';

interface RefundRow {
  id: string;
  saleId: string;
  invoiceNumber: string;
  customerName: string | null;
  amount: string;
  reason: string;
  status: string;
  createdAt: string;
}

export default function RefundsPage(): React.JSX.Element {
  return (
    <ResourceList<RefundRow>
      title="Refunds"
      path="/refunds"
      columns={[
        {
          key: 'inv',
          header: 'Invoice',
          render: (row) => (
            <Link href={`/sales/${row.saleId}`} className="underline-offset-4 hover:underline">
              {row.invoiceNumber}
            </Link>
          ),
        },
        { key: 'cust', header: 'Customer', render: (row) => row.customerName ?? '—' },
        { key: 'amt', header: 'Amount', render: (row) => formatMoney(row.amount) },
        { key: 'reason', header: 'Reason', hideOnMobile: true, render: (row) => row.reason },
        { key: 'st', header: 'Status', render: (row) => row.status },
        { key: 'dt', header: 'Date', hideOnMobile: true, render: (row) => formatDateTime(row.createdAt) },
      ]}
    />
  );
}
