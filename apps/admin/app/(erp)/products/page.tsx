'use client';

import Link from 'next/link';
import { Badge, Button } from '@jersey-commerce/ui';
import { ResourceList } from '@/components/resource-list';
import { formatMoney, statusLabel } from '@/lib/format';
import { useAuth } from '@/lib/auth';

interface ProductRow {
  id: string;
  name: string;
  status: string;
  category?: { name: string } | null;
  lowestPrice?: string | null;
}

export default function ProductsPage(): React.JSX.Element {
  const auth = useAuth();
  return (
    <ResourceList<ProductRow>
      title="Products"
      description="Catalog items with size/colour variants. Create a category first if the list is empty."
      path="/products"
      rowHref={(row) => `/products/${row.id}`}
      actions={
        auth.can('products.create') ? (
          <Button asChild>
            <Link href="/products/new">Add product</Link>
          </Button>
        ) : null
      }
      columns={[
        { key: 'name', header: 'Product', render: (row) => row.name },
        { key: 'cat', header: 'Category', hideOnMobile: true, render: (row) => row.category?.name ?? '—' },
        { key: 'price', header: 'Price', render: (row) => formatMoney(row.lowestPrice ?? '0') },
        { key: 'st', header: 'Status', render: (row) => <Badge variant="secondary">{statusLabel(row.status)}</Badge> },
      ]}
    />
  );
}
