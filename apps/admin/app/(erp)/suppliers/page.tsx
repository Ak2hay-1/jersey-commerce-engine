'use client';

import Link from 'next/link';
import { Button } from '@jersey-commerce/ui';
import { ResourceList } from '@/components/resource-list';
import { statusLabel } from '@/lib/format';
import { useAuth } from '@/lib/auth';

interface SupplierRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
}

export default function SuppliersPage(): React.JSX.Element {
  const auth = useAuth();
  return (
    <ResourceList<SupplierRow>
      title="Suppliers"
      path="/suppliers"
      rowHref={(row) => `/suppliers/${row.id}`}
      actions={
        auth.can('suppliers.create') ? (
          <Button asChild>
            <Link href="/suppliers/new">Add supplier</Link>
          </Button>
        ) : null
      }
      columns={[
        { key: 'name', header: 'Supplier', render: (row) => row.name },
        { key: 'phone', header: 'Phone', hideOnMobile: true, render: (row) => row.phone ?? '—' },
        { key: 'email', header: 'Email', hideOnMobile: true, render: (row) => row.email ?? '—' },
        { key: 'st', header: 'Status', render: (row) => statusLabel(row.status) },
      ]}
    />
  );
}
