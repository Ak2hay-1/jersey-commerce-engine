'use client';

import { ReportPage, formatMoney } from '@/components/report-page';
import { statusLabel } from '@/lib/format';

interface Row {
  purchaseNumber: string;
  supplierName: string;
  quantityOrdered: number;
  total: string;
  outstanding: string;
  status: string;
}

export default function PurchaseReportPage(): React.JSX.Element {
  return (
    <ReportPage<Row>
      title="Purchase report"
      description="Payable purchases, quantities, and outstanding supplier balances."
      path="/reports/purchases"
      exportPath="/reports/purchases/export"
      totals={(data) => {
        const totals = (data as { totals?: { purchaseCount: number; total: string; outstanding: string } })?.totals;
        if (!totals) return [];
        return [
          { label: 'Purchases', value: String(totals.purchaseCount) },
          { label: 'Total', value: formatMoney(totals.total) },
          { label: 'Outstanding', value: formatMoney(totals.outstanding) },
        ];
      }}
      columns={[
        { key: 'no', header: 'Purchase', render: (row) => row.purchaseNumber },
        { key: 'sup', header: 'Supplier', render: (row) => row.supplierName },
        { key: 'qty', header: 'Qty', render: (row) => row.quantityOrdered },
        { key: 'total', header: 'Cost', render: (row) => formatMoney(row.total) },
        { key: 'out', header: 'Outstanding', render: (row) => formatMoney(row.outstanding) },
        { key: 'st', header: 'Status', hideOnMobile: true, render: (row) => statusLabel(row.status) },
      ]}
    />
  );
}
