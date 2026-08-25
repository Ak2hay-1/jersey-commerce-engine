'use client';

import Link from 'next/link';
import { Button } from '@jersey-commerce/ui';
import { ResourceList } from '@/components/resource-list';
import { statusLabel } from '@/lib/format';
import { useAuth } from '@/lib/auth';

interface CategoryRow {
  id: string;
  name: string;
  status: string;
  productCount?: number;
}

export default function CategoriesPage(): React.JSX.Element {
  const auth = useAuth();
  return (
    <ResourceList<CategoryRow>
      title="Categories"
      description="Organize the catalog. Archive categories that still have products."
      path="/categories"
      rowHref={(row) => `/categories/${row.id}`}
      actions={
        auth.can('categories.create') ? (
          <Button asChild>
            <Link href="/categories/new">Add category</Link>
          </Button>
        ) : null
      }
      columns={[
        { key: 'name', header: 'Category', render: (row) => row.name },
        { key: 'st', header: 'Status', render: (row) => statusLabel(row.status) },
        { key: 'count', header: 'Products', hideOnMobile: true, render: (row) => row.productCount ?? '—' },
      ]}
    />
  );
}
