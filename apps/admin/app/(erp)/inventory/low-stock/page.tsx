'use client';

import { ResourceList } from '@/components/resource-list';
import { formatMoney, statusLabel } from '@/lib/format';

interface InventoryRow {
  productVariantId: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  reorderLevel: number;
  stockStatus: string;
  sellingPrice: string;
}

export default function LowStockPage(): React.JSX.Element {
  return (
    <ResourceList<InventoryRow>
      title="Low stock"
      path="/inventory"
      extraQuery={{ lowStock: 'true' }}
      rowHref={(row) => `/inventory/${row.productVariantId}`}
      columns={[
        { key: 'name', header: 'Product', render: (row) => `${row.productName} / ${row.variantLabel}` },
        { key: 'qty', header: 'Stock', render: (row) => row.quantity },
        { key: 're', header: 'Reorder', render: (row) => row.reorderLevel },
        { key: 'st', header: 'Status', render: (row) => statusLabel(row.stockStatus) },
        { key: 'price', header: 'Selling', hideOnMobile: true, render: (row) => formatMoney(row.sellingPrice) },
      ]}
    />
  );
}
