'use client';

import { ResourceList } from '@/components/resource-list';
import { formatDate, statusLabel } from '@/lib/format';

interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  createdAt: string;
}

export default function CustomersPage(): React.JSX.Element {
  return (
    <ResourceList<CustomerRow>
      title="Customers"
      path="/customers"
      rowHref={(row) => `/customers/${row.id}`}
      columns={[
        { key: 'name', header: 'Customer', render: (row) => row.name },
        { key: 'phone', header: 'Phone', render: (row) => row.phone ?? '—' },
        { key: 'email', header: 'Email', hideOnMobile: true, render: (row) => row.email ?? '—' },
        { key: 'st', header: 'Status', render: (row) => statusLabel(row.status) },
        { key: 'dt', header: 'Created', hideOnMobile: true, render: (row) => formatDate(row.createdAt) },
      ]}
    />
  );
}
