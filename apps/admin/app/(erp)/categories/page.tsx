'use client';

import { ResourceList } from '@/components/resource-list';
import { statusLabel } from '@/lib/format';

interface CategoryRow {
  id: string;
  name: string;
  status: string;
  productCount?: number;
}

export default function CategoriesPage(): React.JSX.Element {
  return (
    <ResourceList<CategoryRow>
      title="Categories"
      path="/categories"
      columns={[
        { key: 'name', header: 'Category', render: (row) => row.name },
        { key: 'st', header: 'Status', render: (row) => statusLabel(row.status) },
        { key: 'count', header: 'Products', hideOnMobile: true, render: (row) => row.productCount ?? '—' },
      ]}
    />
  );
}
