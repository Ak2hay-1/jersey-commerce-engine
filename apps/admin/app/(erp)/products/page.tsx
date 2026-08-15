'use client';

import { Badge } from '@jersey-commerce/ui';
import { ResourceList } from '@/components/resource-list';
import { formatMoney, statusLabel } from '@/lib/format';

interface ProductRow {
  id: string;
  name: string;
  status: string;
  category?: { name: string } | null;
  lowestPrice?: string | null;
  highestPrice?: string | null;
}

export default function ProductsPage(): React.JSX.Element {
  return (
    <ResourceList<ProductRow>
      title="Products"
      path="/products"
      rowHref={(row) => `/products/${row.id}`}
      columns={[
        { key: 'name', header: 'Product', render: (row) => row.name },
        { key: 'cat', header: 'Category', hideOnMobile: true, render: (row) => row.category?.name ?? '—' },
        { key: 'price', header: 'Price', render: (row) => formatMoney(row.lowestPrice ?? '0') },
        { key: 'st', header: 'Status', render: (row) => <Badge variant="secondary">{statusLabel(row.status)}</Badge> },
      ]}
    />
  );
}
