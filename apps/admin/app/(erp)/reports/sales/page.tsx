'use client';

import { ReportPage, formatMoney } from '@/components/report-page';
import { statusLabel } from '@/lib/format';

interface Row {
  invoiceNumber: string;
  source: string;
  customerName: string | null;
  revenue: string;
  cogs: string;
  grossProfit: string;
  marginPercent: string;
  status: string;
}

export default function SalesReportPage(): React.JSX.Element {
  return (
    <ReportPage<Row>
      title="Sales report"
      description="Recognized POS sales and completed orders. COGS uses transaction-time cost prices."
      path="/reports/sales"
      exportPath="/reports/sales/export"
      showSource
      showPayment
      totals={(data) => {
        const totals = (data as { totals?: Row & { orderCount?: number; discount?: string; tax?: string } })?.totals;
        if (!totals) return [];
        return [
          { label: 'Revenue', value: formatMoney(totals.revenue) },
          { label: 'COGS', value: formatMoney(totals.cogs) },
          { label: 'Gross profit', value: formatMoney(totals.grossProfit) },
          { label: 'Margin', value: `${totals.marginPercent}%` },
        ];
      }}
      columns={[
        { key: 'inv', header: 'Invoice', render: (row) => row.invoiceNumber },
        { key: 'src', header: 'Source', render: (row) => row.source },
        { key: 'cust', header: 'Customer', render: (row) => row.customerName ?? '—' },
        { key: 'rev', header: 'Revenue', render: (row) => formatMoney(row.revenue) },
        { key: 'cogs', header: 'COGS', hideOnMobile: true, render: (row) => formatMoney(row.cogs) },
        { key: 'gp', header: 'Gross profit', render: (row) => formatMoney(row.grossProfit) },
        { key: 'm', header: 'Margin', hideOnMobile: true, render: (row) => `${row.marginPercent}%` },
        { key: 'st', header: 'Status', hideOnMobile: true, render: (row) => statusLabel(row.status) },
      ]}
    />
  );
}
