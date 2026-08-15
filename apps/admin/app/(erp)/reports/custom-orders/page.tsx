'use client';

import { useEffect, useState } from 'react';
import type { CustomOrderReportResult } from '@jersey-commerce/types';
import { apiRequest, queryString } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { ReportFilters, type ReportFilterValue } from '@/components/report-filters';
import { Card, CardContent, CardHeader, CardTitle } from '@jersey-commerce/ui';

export default function CustomOrderReportPage(): React.JSX.Element {
  const [filters, setFilters] = useState<ReportFilterValue>({ preset: 'today' });
  const [data, setData] = useState<CustomOrderReportResult | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    apiRequest<CustomOrderReportResult>(
      `/reports/custom-orders${queryString({ preset: filters.preset, from: filters.from, to: filters.to })}`,
    )
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, [filters]);

  async function onExport(): Promise<void> {
    const qs = queryString({ preset: filters.preset, from: filters.from, to: filters.to });
    const blob = await apiRequest<Blob>(`/reports/custom-orders/export${qs}`);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'custom-order-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const totals = data?.totals;
  return (
    <div className="space-y-4">
      <PageHeader title="Custom order report" description="Funnel counts, quoted value, confirmed value, and outstanding balances." />
      <ReportFilters value={filters} onChange={setFilters} canExport onExport={() => void onExport()} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Enquiries', totals?.enquiries],
          ['Quotes', totals?.quotes],
          ['Confirmed', totals?.confirmedOrders],
          ['Production', totals?.productionOrders],
          ['Completed', totals?.completedOrders],
          ['Cancelled', totals?.cancelledOrders],
          ['Quoted value', totals ? formatMoney(totals.quotedValue) : '—'],
          ['Confirmed value', totals ? formatMoney(totals.confirmedValue) : '—'],
          ['Outstanding', totals ? formatMoney(totals.outstandingBalances) : '—'],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs uppercase text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-xl font-semibold">{value ?? 0}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
