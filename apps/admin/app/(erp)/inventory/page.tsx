'use client';

import { ResourceList } from '@/components/resource-list';
import { formatMoney, statusLabel } from '@/lib/format';

interface InventoryRow {
  productVariantId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
  costPrice: string;
  sellingPrice: string;
  stockStatus: string;
}

export default function InventoryPage(): React.JSX.Element {
  return (
    <ResourceList<InventoryRow>
      title="Stock"
      path="/inventory"
      rowHref={(row) => `/inventory/${row.productVariantId}`}
      columns={[
        { key: 'name', header: 'Product', render: (row) => `${row.productName} / ${row.variantLabel}` },
        { key: 'sku', header: 'SKU', hideOnMobile: true, render: (row) => row.sku },
        { key: 'qty', header: 'Stock', render: (row) => row.quantity },
        { key: 'res', header: 'Reserved', hideOnMobile: true, render: (row) => row.reservedQuantity },
        { key: 'av', header: 'Available', render: (row) => row.availableQuantity },
        { key: 're', header: 'Reorder', hideOnMobile: true, render: (row) => row.reorderLevel },
        { key: 'cost', header: 'Cost', hideOnMobile: true, render: (row) => formatMoney(row.costPrice) },
        { key: 'st', header: 'Status', render: (row) => statusLabel(row.stockStatus) },
      ]}
    />
  );
}
