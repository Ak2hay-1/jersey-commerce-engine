'use client';

import { ReportPage, formatMoney } from '@/components/report-page';
import { formatDate } from '@/lib/format';

interface Row {
  category: string;
  amount: string;
  expenseDate: string;
  status: string;
}

export default function ExpenseReportPage(): React.JSX.Element {
  return (
    <ReportPage<Row>
      title="Expense report"
      description="Active operating expenses. Voided expenses are excluded from totals."
      path="/reports/expenses"
      exportPath="/reports/expenses/export"
      totals={(data) => {
        const totals = (data as { totals?: { totalExpenses: string } })?.totals;
        if (!totals) return [];
        return [{ label: 'Total expenses', value: formatMoney(totals.totalExpenses) }];
      }}
      columns={[
        { key: 'date', header: 'Date', render: (row) => formatDate(row.expenseDate) },
        { key: 'cat', header: 'Category', render: (row) => row.category },
        { key: 'amt', header: 'Amount', render: (row) => formatMoney(row.amount) },
        { key: 'st', header: 'Status', render: (row) => row.status },
      ]}
    />
  );
}
