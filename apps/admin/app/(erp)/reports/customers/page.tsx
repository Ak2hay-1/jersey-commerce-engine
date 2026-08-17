'use client';

import { ReportPage, formatMoney } from '@/components/report-page';

interface Row {
  name: string;
  orderCount: number;
  totalSpent: string;
  averageOrderValue: string;
  segment: string;
}

export default function CustomerReportPage(): React.JSX.Element {
  return (
    <ReportPage<Row>
      title="Customer report"
      description="New, repeat, high-value, and top customers from completed purchases."
      path="/reports/customers"
      exportPath="/reports/customers/export"
      totals={(data) => {
        const totals = (data as { totals?: { newCustomers: number; repeatCustomers: number; totalSpending: string; averageOrderValue: string } })?.totals;
        if (!totals) return [];
        return [
          { label: 'New', value: String(totals.newCustomers) },
          { label: 'Repeat', value: String(totals.repeatCustomers) },
          { label: 'Spending', value: formatMoney(totals.totalSpending) },
          { label: 'AOV', value: formatMoney(totals.averageOrderValue) },
        ];
      }}
      columns={[
        { key: 'name', header: 'Customer', render: (row) => row.name },
        { key: 'orders', header: 'Orders', render: (row) => row.orderCount },
        { key: 'spent', header: 'Spent', render: (row) => formatMoney(row.totalSpent) },
        { key: 'aov', header: 'AOV', hideOnMobile: true, render: (row) => formatMoney(row.averageOrderValue) },
        { key: 'seg', header: 'Segment', render: (row) => row.segment },
      ]}
    />
  );
}
