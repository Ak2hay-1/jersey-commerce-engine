'use client';

import Link from 'next/link';
import { Button } from '@jersey-commerce/ui';
import { ResourceList } from '@/components/resource-list';
import { formatDate, statusLabel } from '@/lib/format';
import { useAuth } from '@/lib/auth';

interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  createdAt: string;
}

export default function CustomersPage(): React.JSX.Element {
  const auth = useAuth();
  return (
    <ResourceList<CustomerRow>
      title="Customers"
      path="/customers"
      rowHref={(row) => `/customers/${row.id}`}
      actions={
        auth.can('customers.create') ? (
          <Button asChild>
            <Link href="/customers/new">Add customer</Link>
          </Button>
        ) : null
      }
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
