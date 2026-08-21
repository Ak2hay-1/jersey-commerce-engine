'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@jersey-commerce/ui';
import { realtimeAffectsResource } from '@jersey-commerce/utils';
import { apiRequest, queryString } from '@/lib/api';
import { formatMoney, formatNumber } from '@/lib/format';
import { useRealtimeReload } from '@/lib/realtime';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { ReportFilters, type ReportFilterValue } from '@/components/report-filters';

interface ReportPageProps<T> {
  title: string;
  description: string;
  path: string;
  exportPath?: string;
  columns: Array<DataTableColumn<T>>;
  showSource?: boolean;
  showPayment?: boolean;
  totals?: (data: unknown) => Array<{ label: string; value: string }>;
}

export function ReportPage<T>({
  title,
  description,
  path,
  exportPath,
  columns,
  showSource,
  showPayment,
  totals,
}: ReportPageProps<T>): React.JSX.Element {
  const [filters, setFilters] = useState<ReportFilterValue>({ preset: 'today' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items?: T[]; methods?: T[]; meta?: { page: number; totalPages: number }; totals?: unknown; range?: unknown } | null>(null);
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
        setData(await apiRequest<typeof data>(`${path}${qs}`));
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load report');
      } finally {
        setLoading(false);
      }
    },
    [filters, page, path],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeReload((event) => realtimeAffectsResource('/reports', event.entity), () => load(true));

  async function onExport(): Promise<void> {
    if (!exportPath) return;
    const qs = queryString({
      preset: filters.preset,
      from: filters.preset === 'custom' ? filters.from : undefined,
      to: filters.preset === 'custom' ? filters.to : undefined,
      source: filters.source,
      paymentMethod: filters.paymentMethod,
    });
    const blob = await apiRequest<Blob>(`${exportPath}${qs}`);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replaceAll(' ', '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const rows = (data?.items ?? data?.methods ?? []) as T[];
  const kpi = totals?.(data);

  return (
    <div className="space-y-4">
      <PageHeader title={title} description={description} />
      <ReportFilters
        value={filters}
        onChange={(next) => {
          setPage(1);
          setFilters(next);
        }}
        showSource={showSource}
        showPayment={showPayment}
        canExport={Boolean(exportPath)}
        onExport={() => void onExport()}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {kpi ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpi.map((item) => (
            <Card key={item.label}>
              <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs uppercase text-muted-foreground">{item.label}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-xl font-semibold tabular-nums">{item.value}</CardContent>
            </Card>
          ))}
        </div>
      ) : null}
      <DataTable
        caption={title}
        columns={columns}
        rows={rows}
        loading={loading}
        page={data?.meta?.page ?? page}
        totalPages={data?.meta?.totalPages ?? 1}
        onPageChange={setPage}
      />
    </div>
  );
}

export { formatMoney, formatNumber };
