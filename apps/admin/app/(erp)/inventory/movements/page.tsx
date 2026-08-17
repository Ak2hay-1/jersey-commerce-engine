'use client';

import { ResourceList } from '@/components/resource-list';
import { formatDateTime } from '@/lib/format';

interface MovementRow {
  id: string;
  productVariantId: string;
  productName?: string;
  variantLabel?: string;
  sku?: string;
  type: string;
  quantity: number;
  reason: string | null;
  date: string;
}

export default function MovementsPage(): React.JSX.Element {
  return (
    <ResourceList<MovementRow>
      title="Stock movements"
      description="Append-only inventory ledger for this tenant."
      path="/inventory/movements"
      rowHref={(row) => `/inventory/${row.productVariantId}`}
      columns={[
        { key: 'name', header: 'Product', render: (row) => `${row.productName ?? 'Variant'} / ${row.variantLabel ?? '—'}` },
        { key: 'sku', header: 'SKU', hideOnMobile: true, render: (row) => row.sku ?? '—' },
        { key: 'type', header: 'Type', render: (row) => row.type },
        { key: 'qty', header: 'Qty', render: (row) => row.quantity },
        { key: 'reason', header: 'Reason', hideOnMobile: true, render: (row) => row.reason ?? '—' },
        { key: 'dt', header: 'Date', hideOnMobile: true, render: (row) => formatDateTime(row.date) },
      ]}
    />
  );
}
