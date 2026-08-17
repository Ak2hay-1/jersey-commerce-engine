'use client';

import { ReportPage, formatMoney } from '@/components/report-page';
import { statusLabel } from '@/lib/format';

interface Row {
  productName: string;
  variantLabel: string;
  sku: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
  costValue: string;
  sellingValue: string;
  stockStatus: string;
}

export default function InventoryReportPage(): React.JSX.Element {
  return (
    <ReportPage<Row>
      title="Inventory report"
      description="Current stock, reserved quantity, available quantity, and valuation at today's catalog prices."
      path="/reports/inventory"
      exportPath="/reports/inventory/export"
      totals={(data) => {
        const totals = (data as { totals?: { quantity: number; reservedQuantity: number; costValue: string; sellingValue: string } })?.totals;
        if (!totals) return [];
        return [
          { label: 'On hand', value: String(totals.quantity) },
          { label: 'Reserved', value: String(totals.reservedQuantity) },
          { label: 'Cost value', value: formatMoney(totals.costValue) },
          { label: 'Selling value', value: formatMoney(totals.sellingValue) },
        ];
      }}
      columns={[
        { key: 'name', header: 'Product', render: (row) => `${row.productName} / ${row.variantLabel}` },
        { key: 'sku', header: 'SKU', hideOnMobile: true, render: (row) => row.sku },
        { key: 'qty', header: 'Stock', render: (row) => row.quantity },
        { key: 'res', header: 'Reserved', hideOnMobile: true, render: (row) => row.reservedQuantity },
        { key: 'av', header: 'Available', render: (row) => row.availableQuantity },
        { key: 'cost', header: 'Cost value', hideOnMobile: true, render: (row) => formatMoney(row.costValue) },
        { key: 'sell', header: 'Selling value', hideOnMobile: true, render: (row) => formatMoney(row.sellingValue) },
        { key: 'st', header: 'Status', render: (row) => statusLabel(row.stockStatus) },
      ]}
    />
  );
}
