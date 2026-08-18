'use client';

import { ResourceList } from '@/components/resource-list';
import { formatDateTime, formatMoney } from '@/lib/format';

interface PaymentRow {
  id: string;
  supplier?: { name: string } | null;
  amount: string;
  paymentMethod: string;
  createdAt: string;
  reference?: string | null;
}

export default function SupplierPaymentsPage(): React.JSX.Element {
  return (
    <ResourceList<PaymentRow>
      title="Supplier payments"
      path="/supplier-payments"
      columns={[
        { key: 'sup', header: 'Supplier', render: (row) => row.supplier?.name ?? '—' },
        { key: 'amt', header: 'Amount', render: (row) => formatMoney(row.amount) },
        { key: 'method', header: 'Method', render: (row) => row.paymentMethod },
        { key: 'ref', header: 'Reference', hideOnMobile: true, render: (row) => row.reference ?? '—' },
        { key: 'dt', header: 'Date', hideOnMobile: true, render: (row) => formatDateTime(row.createdAt) },
      ]}
    />
  );
}
