'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@jersey-commerce/ui';
import { realtimeAffectsResource } from '@jersey-commerce/utils';
import type { SalesReportResult } from '@jersey-commerce/types';
import { apiRequest, queryString } from '@/lib/api';
import { formatMoney, statusLabel } from '@/lib/format';
import { useRealtimeReload } from '@/lib/realtime';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { ReportFilters, type ReportFilterValue } from '@/components/report-filters';

export default function SalesReportPage(): React.JSX.Element {
  const [filters, setFilters] = useState<ReportFilterValue>({ preset: 'today' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SalesReportResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (silent = false) => {
      const qs = queryString({
        preset: filters.preset,
        from: filters.preset === 'custom' ? filters.from : undefined,
        to: filters.preset === 'custom' ? filters.to : undefined,
        source: filters.source,
        paymentMethod: filters.paymentMethod,
        page,
        pageSize: 20,
      });
      if (!silent) {
        setLoading(true);
      }
      try {
        setData(await apiRequest<SalesReportResult>(`/reports/sales${qs}`));
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load report');
      } finally {
        setLoading(false);
      }
    },
    [filters, page],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeReload((event) => realtimeAffectsResource('/reports', event.entity), () => load(true));

  async function onExport(): Promise<void> {
    const qs = queryString({
      preset: filters.preset,
      from: filters.preset === 'custom' ? filters.from : undefined,
      to: filters.preset === 'custom' ? filters.to : undefined,
      source: filters.source,
      paymentMethod: filters.paymentMethod,
    });
    const blob = await apiRequest<Blob>(`/reports/sales/export${qs}`);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sales-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const totals = data?.totals;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sales report"
        description="Recognized POS sales and completed orders with day, channel, and product breakdowns."
      />
      <ReportFilters
        value={filters}
        onChange={(next) => {
          setPage(1);
          setFilters(next);
        }}
        showSource
        showPayment
        canExport
        onExport={() => void onExport()}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {totals ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {[
            { label: 'Orders', value: String(totals.orderCount ?? 0) },
            { label: 'Revenue', value: formatMoney(totals.revenue) },
            { label: 'Discount', value: formatMoney(totals.discount) },
            { label: 'Tax', value: formatMoney(totals.tax) },
            { label: 'COGS', value: formatMoney(totals.cogs) },
            { label: 'Gross profit', value: formatMoney(totals.grossProfit) },
            { label: 'Margin', value: `${totals.marginPercent}%` },
          ].map((item) => (
            <Card key={item.label}>
              <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs uppercase text-muted-foreground">{item.label}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-xl font-semibold tabular-nums">{item.value}</CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">By day</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <DataTable
              caption="By day"
              columns={[
                { key: 'd', header: 'Day', render: (row) => row.label },
                { key: 'o', header: 'Orders', render: (row) => String(row.orderCount) },
                { key: 'r', header: 'Revenue', render: (row) => formatMoney(row.revenue) },
              ]}
              rows={data?.byDay ?? []}
              loading={loading}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">By channel</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <DataTable
              caption="By channel"
              columns={[
                { key: 's', header: 'Source', render: (row) => row.source },
                { key: 'c', header: 'Orders', render: (row) => String(row.count) },
                { key: 'r', header: 'Revenue', render: (row) => formatMoney(row.revenue) },
              ]}
              rows={data?.byChannel ?? []}
              loading={loading}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Top products</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <DataTable
              caption="Top products"
              columns={[
                { key: 'n', header: 'Product', render: (row) => row.productName },
                { key: 'q', header: 'Qty', hideOnMobile: true, render: (row) => String(row.quantity) },
                { key: 'r', header: 'Revenue', render: (row) => formatMoney(row.revenue) },
              ]}
              rows={data?.byProduct ?? []}
              loading={loading}
            />
          </CardContent>
        </Card>
      </div>

      <DataTable
        caption="Sales"
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
        rows={data?.items ?? []}
        loading={loading}
        page={data?.meta?.page ?? page}
        totalPages={data?.meta?.totalPages ?? 1}
        onPageChange={setPage}
      />
    </div>
  );
}
