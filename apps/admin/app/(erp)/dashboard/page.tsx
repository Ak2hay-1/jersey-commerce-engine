'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@jersey-commerce/ui';
import type { DashboardSummary, DashboardWidgets, RevenueSeries } from '@jersey-commerce/types';
import { apiRequest, queryString } from '@/lib/api';
import { formatMoney, formatNumber, formatDateTime, statusLabel } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { DataTable } from '@/components/data-table';
import { KpiCard, PageHeader } from '@/components/page-header';
import { ReportFilters, type ReportFilterValue } from '@/components/report-filters';
import { RevenueChart } from '@/components/revenue-chart';

export default function DashboardPage(): React.JSX.Element {
  const auth = useAuth();
  const [filters, setFilters] = useState<ReportFilterValue>({ preset: 'today' });
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [widgets, setWidgets] = useState<DashboardWidgets | null>(null);
  const [revenue, setRevenue] = useState<RevenueSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      setError('');
      const qs = queryString({
        preset: filters.preset,
        from: filters.preset === 'custom' ? filters.from : undefined,
        to: filters.preset === 'custom' ? filters.to : undefined,
      });
      try {
        const [nextSummary, nextWidgets, nextRevenue] = await Promise.all([
          apiRequest<DashboardSummary>(`/dashboard/summary${qs}`),
          apiRequest<DashboardWidgets>(`/dashboard/widgets${qs}`),
          auth.can('sales.read') || auth.can('reports.read')
            ? apiRequest<RevenueSeries>(`/dashboard/revenue${qs}`)
            : Promise.resolve(null),
        ]);
        if (!cancelled) {
          setSummary(nextSummary);
          setWidgets(nextWidgets);
          setRevenue(nextRevenue);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load dashboard');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [auth, filters.from, filters.preset, filters.to]);

  const kpis = summary?.kpis;

  return (
    <div className="space-y-4">
      <PageHeader title="Dashboard" description="Operational snapshot for the selected period." />
      <ReportFilters value={filters} onChange={setFilters} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis?.revenue != null ? <KpiCard label="Revenue" value={formatMoney(kpis.revenue)} /> : null}
        {kpis?.grossProfit != null ? (
          <KpiCard label="Gross profit" value={formatMoney(kpis.grossProfit)} hint={kpis.marginPercent ? `${kpis.marginPercent}% margin` : undefined} />
        ) : null}
        {kpis?.orders != null ? <KpiCard label="Orders" value={formatNumber(kpis.orders)} /> : null}
        {kpis?.averageOrderValue != null ? <KpiCard label="Average order value" value={formatMoney(kpis.averageOrderValue)} /> : null}
        {kpis?.customers != null ? <KpiCard label="New customers" value={formatNumber(kpis.customers)} /> : null}
        {kpis?.inventoryValue != null ? <KpiCard label="Inventory value" value={formatMoney(kpis.inventoryValue)} /> : null}
        {kpis?.outstandingSupplierBalance != null ? (
          <KpiCard label="Supplier balance" value={formatMoney(kpis.outstandingSupplierBalance)} />
        ) : null}
        {kpis?.expenses != null ? <KpiCard label="Expenses" value={formatMoney(kpis.expenses)} /> : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="p-4">
            <CardTitle className="text-sm">Revenue</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? <Skeleton className="h-52 w-full" /> : <RevenueChart points={revenue?.points ?? []} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-sm">Sales channels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0 text-sm">
            {(summary?.salesChannels ?? []).map((row) => (
              <div key={row.source} className="flex justify-between">
                <span>{row.source}</span>
                <span className="tabular-nums">{formatMoney(row.revenue)}</span>
              </div>
            ))}
            <div className="border-t pt-2">
              <p className="mb-2 font-medium">Payments</p>
              {(summary?.payments ?? []).map((row) => (
                <div key={row.method} className="flex justify-between">
                  <span>{row.method}</span>
                  <span className="tabular-nums">{formatMoney(row.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-4">
            <CardTitle className="text-sm">Top products</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              caption="Top selling products"
              rows={widgets?.topProducts ?? []}
              loading={loading}
              columns={[
                { key: 'name', header: 'Product', render: (row) => row.productName },
                { key: 'qty', header: 'Qty', render: (row) => row.quantity },
                { key: 'rev', header: 'Revenue', render: (row) => formatMoney(row.revenue) },
                { key: 'gp', header: 'Gross profit', hideOnMobile: true, render: (row) => formatMoney(row.grossProfit) },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-4">
            <CardTitle className="text-sm">Inventory alerts</CardTitle>
            {auth.can('inventory.read') ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/inventory/low-stock">View inventory</Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="grid gap-4 p-4 pt-0 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Low stock</p>
              <ul className="space-y-2 text-sm">
                {(widgets?.lowStock ?? []).map((row) => (
                  <li key={row.productVariantId}>
                    <Link href={`/inventory/${row.productVariantId}`} className="hover:underline">
                      {row.productName} / {row.variantLabel}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Stock {row.quantity} · reorder {row.reorderLevel}
                    </p>
                  </li>
                ))}
                {(widgets?.lowStock ?? []).length === 0 ? <li className="text-muted-foreground">None</li> : null}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Out of stock</p>
              <ul className="space-y-2 text-sm">
                {(widgets?.outOfStock ?? []).map((row) => (
                  <li key={row.productVariantId}>
                    <Link href={`/inventory/${row.productVariantId}`} className="hover:underline">
                      {row.productName} / {row.variantLabel}
                    </Link>
                  </li>
                ))}
                {(widgets?.outOfStock ?? []).length === 0 ? <li className="text-muted-foreground">None</li> : null}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-sm">Recent sales</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            caption="Recent sales"
            rows={widgets?.recentSales ?? []}
            loading={loading}
            rowHref={(row) => `/sales/${row.id}`}
            columns={[
              { key: 'inv', header: 'Invoice', render: (row) => row.invoiceNumber },
              { key: 'cust', header: 'Customer', render: (row) => row.customerName ?? 'Walk-in' },
              { key: 'cash', header: 'Cashier', hideOnMobile: true, render: (row) => row.cashierName ?? '—' },
              { key: 'src', header: 'Source', render: (row) => row.source },
              { key: 'amt', header: 'Amount', render: (row) => formatMoney(row.amount) },
              { key: 'pay', header: 'Payment', hideOnMobile: true, render: (row) => row.paymentMethod ?? '—' },
              { key: 'st', header: 'Status', render: (row) => <Badge variant="secondary">{statusLabel(row.status)}</Badge> },
              { key: 'dt', header: 'Date', hideOnMobile: true, render: (row) => formatDateTime(row.createdAt) },
            ]}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-4">
            <CardTitle className="text-sm">Recent orders</CardTitle>
            {auth.can('orders.read') ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/orders">View orders</Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              caption="Recent orders"
              rows={widgets?.recentOrders ?? []}
              loading={loading}
              rowHref={(row) => `/orders/${row.id}`}
              columns={[
                { key: 'no', header: 'Order', render: (row) => row.orderNumber },
                { key: 'cust', header: 'Customer', render: (row) => row.customerName ?? '—' },
                { key: 'src', header: 'Source', render: (row) => row.source },
                { key: 'amt', header: 'Amount', render: (row) => formatMoney(row.amount) },
                { key: 'pay', header: 'Payment', hideOnMobile: true, render: (row) => row.paymentStatus },
                { key: 'st', header: 'Status', render: (row) => statusLabel(row.status) },
                { key: 'dt', header: 'Date', hideOnMobile: true, render: (row) => formatDateTime(row.createdAt) },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-4">
            <CardTitle className="text-sm">Customers & purchasing</CardTitle>
            <div className="flex gap-2">
              {auth.can('customers.read') ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/customers">CRM</Link>
                </Button>
              ) : null}
              {auth.can('purchases.read') ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/purchases">Purchasing</Link>
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 pt-0 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Customers</p>
              <p>New {summary?.customers.newCustomers ?? 0}</p>
              <p>Repeat {summary?.customers.repeatCustomers ?? 0}</p>
              <p>High-value {summary?.customers.highValueCustomers ?? 0}</p>
              <p>Inactive {summary?.customers.inactiveCustomers ?? 0}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Purchases</p>
              <p>Count {summary?.purchases.purchaseCount ?? 0}</p>
              <p>Total {formatMoney(summary?.purchases.purchaseTotal)}</p>
              <p>Outstanding {formatMoney(summary?.purchases.outstandingSupplierBalance)}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="mb-1 text-xs uppercase text-muted-foreground">Expenses by category</p>
              {(summary?.expensesByCategory ?? []).slice(0, 5).map((row) => (
                <div key={row.category} className="flex justify-between">
                  <span>{row.category}</span>
                  <span className="tabular-nums">{formatMoney(row.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
