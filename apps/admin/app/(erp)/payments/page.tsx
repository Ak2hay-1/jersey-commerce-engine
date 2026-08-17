'use client';

import { ResourceList } from '@/components/resource-list';
import { formatDateTime, formatMoney, statusLabel } from '@/lib/format';

interface PaymentRow {
  id: string;
  method: string;
  amount: string;
  status: string;
  createdAt: string;
  invoiceNumber?: string | null;
}

export default function PaymentsPage(): React.JSX.Element {
  return (
    <ResourceList<PaymentRow>
      title="Payments"
      path="/payments"
      searchKey="reference"
      columns={[
        { key: 'inv', header: 'Invoice', render: (row) => row.invoiceNumber ?? '—' },
        { key: 'method', header: 'Method', render: (row) => row.method },
        { key: 'amt', header: 'Amount', render: (row) => formatMoney(row.amount) },
        { key: 'st', header: 'Status', render: (row) => statusLabel(row.status) },
        { key: 'dt', header: 'Date', hideOnMobile: true, render: (row) => formatDateTime(row.createdAt) },
      ]}
    />
  );
}
