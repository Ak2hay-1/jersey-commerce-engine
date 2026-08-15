'use client';

import { ReportPage, formatMoney } from '@/components/report-page';

interface Row {
  method: string;
  payments: string;
  refunds: string;
  net: string;
}

export default function PaymentReportPage(): React.JSX.Element {
  return (
    <ReportPage<Row>
      title="Payment report"
      description="Completed payments by method, including refunds."
      path="/reports/payments"
      exportPath="/reports/payments/export"
      showPayment
      totals={(data) => {
        const totals = (data as { totals?: { totalPayments: string; refunds: string; net: string } })?.totals;
        if (!totals) return [];
        return [
          { label: 'Payments', value: formatMoney(totals.totalPayments) },
          { label: 'Refunds', value: formatMoney(totals.refunds) },
          { label: 'Net', value: formatMoney(totals.net) },
        ];
      }}
      columns={[
        { key: 'm', header: 'Method', render: (row) => row.method },
        { key: 'p', header: 'Payments', render: (row) => formatMoney(row.payments) },
        { key: 'r', header: 'Refunds', render: (row) => formatMoney(row.refunds) },
        { key: 'n', header: 'Net', render: (row) => formatMoney(row.net) },
      ]}
    />
  );
}
