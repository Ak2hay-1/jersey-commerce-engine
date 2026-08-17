'use client';

import { ResourceList } from '@/components/resource-list';
import { statusLabel } from '@/lib/format';

interface SupplierRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  city?: string | null;
}

export default function SuppliersPage(): React.JSX.Element {
  return (
    <ResourceList<SupplierRow>
      title="Suppliers"
      path="/suppliers"
      rowHref={(row) => `/suppliers/${row.id}`}
      columns={[
        { key: 'name', header: 'Supplier', render: (row) => row.name },
        { key: 'phone', header: 'Phone', hideOnMobile: true, render: (row) => row.phone ?? '—' },
        { key: 'email', header: 'Email', hideOnMobile: true, render: (row) => row.email ?? '—' },
        { key: 'st', header: 'Status', render: (row) => statusLabel(row.status) },
      ]}
    />
  );
}
