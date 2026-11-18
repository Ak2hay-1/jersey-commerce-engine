'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Package, ShoppingBag, Users } from 'lucide-react';
import { Badge, Button, Skeleton } from '@jersey-commerce/ui';
import type { DashboardSummary, DashboardWidgets, RevenueSeries, SalesReportResult } from '@jersey-commerce/types';
import { realtimeAffectsResource } from '@jersey-commerce/utils';
import { apiRequest, queryString } from '@/lib/api';
import { formatMoney, formatNumber, formatDateTime, statusLabel } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { useRealtimeReload } from '@/lib/realtime';
import { DataTable } from '@/components/data-table';
import { KpiCard } from '@/components/page-header';
import { ReportFilters, type ReportFilterValue } from '@/components/report-filters';
import { OrdersOverviewChart } from '@/components/dashboard/orders-overview-chart';
import { PurchaseAnalyticsChart } from '@/components/dashboard/purchase-analytics-chart';
import { SaleAnalyticsDonut } from '@/components/dashboard/sale-analytics-donut';

interface PeriodSnapshot {
  revenue: number;
  orders: number;
}

function moneyNumber(value: string | number | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function trendLabel(current: number, previous: number): string | undefined {
  if (previous <= 0 && current <= 0) {
    return undefined;
  }
  if (previous <= 0) {
    return 'New activity today';
  }
  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.abs(pct) >= 10 ? pct.toFixed(0) : pct.toFixed(1);
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${rounded}% vs yesterday`;
}

function productCode(productId: string): string {
  return productId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '—';
}

export default function DashboardPage(): React.JSX.Element {
  const auth = useAuth();
  const [filters, setFilters] = useState<ReportFilterValue>({ preset: 'last_30_days' });
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [widgets, setWidgets] = useState<DashboardWidgets | null>(null);
  const [salesReport, setSalesReport] = useState<SalesReportResult | null>(null);
  const [revenue, setRevenue] = useState<RevenueSeries | null>(null);
  const [todaySnap, setTodaySnap] = useState<PeriodSnapshot | null>(null);
  const [monthSnap, setMonthSnap] = useState<PeriodSnapshot | null>(null);
  const [yesterdaySnap, setYesterdaySnap] = useState<PeriodSnapshot | null>(null);
  const [customerTotal, setCustomerTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
      }
      setError('');
      const qs = queryString({
        preset: filters.preset,
        from: filters.preset === 'custom' ? filters.from : undefined,
        to: filters.preset === 'custom' ? filters.to : undefined,
      });
      try {
        const canSales = auth.can('sales.read') || auth.can('reports.read');
        const chartPreset =
          filters.preset === 'today' || filters.preset === 'yesterday' ? 'last_30_days' : filters.preset;
        const chartQs = queryString({
          preset: chartPreset,
          from: filters.preset === 'custom' ? filters.from : undefined,
          to: filters.preset === 'custom' ? filters.to : undefined,
          page: 1,
          pageSize: 1,
        });
        const [nextSummary, nextWidgets, nextSales, nextRevenue, today, month, yesterday, customersPage] =
          await Promise.all([
            apiRequest<DashboardSummary>(`/dashboard/summary${qs}`),
            apiRequest<DashboardWidgets>(`/dashboard/widgets${qs}`),
            auth.can('reports.read')
              ? apiRequest<SalesReportResult>(`/reports/sales${chartQs}`).catch(() => null)
              : Promise.resolve(null),
            canSales ? apiRequest<RevenueSeries>(`/dashboard/revenue${qs}`).catch(() => null) : Promise.resolve(null),
            canSales
              ? apiRequest<DashboardSummary>(`/dashboard/summary${queryString({ preset: 'today' })}`).catch(() => null)
              : Promise.resolve(null),
            canSales
              ? apiRequest<DashboardSummary>(`/dashboard/summary${queryString({ preset: 'this_month' })}`).catch(() => null)
              : Promise.resolve(null),
            canSales
              ? apiRequest<DashboardSummary>(`/dashboard/summary${queryString({ preset: 'yesterday' })}`).catch(() => null)
              : Promise.resolve(null),
            auth.can('customers.read')
              ? apiRequest<{ items: unknown[]; meta: { totalItems: number } }>(
                  `/customers${queryString({ page: 1, pageSize: 1 })}`,
                ).catch(() => null)
              : Promise.resolve(null),
          ]);

        setSummary(nextSummary);
        setWidgets(nextWidgets);
        setSalesReport(nextSales);
        setRevenue(nextRevenue);
        setTodaySnap(
          today ? { revenue: moneyNumber(today.kpis.revenue), orders: today.kpis.orders ?? 0 } : null,
        );
        setMonthSnap(
          month ? { revenue: moneyNumber(month.kpis.revenue), orders: month.kpis.orders ?? 0 } : null,
        );
        setYesterdaySnap(
          yesterday ? { revenue: moneyNumber(yesterday.kpis.revenue), orders: yesterday.kpis.orders ?? 0 } : null,
        );
        setCustomerTotal(customersPage?.meta?.totalItems ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load dashboard');
      } finally {
        setLoading(false);
      }
    },
    [auth, filters.from, filters.preset, filters.to],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeReload((event) => realtimeAffectsResource('/dashboard', event.entity), () => load(true));

  const kpis = summary?.kpis;
  const revenueTrend = todaySnap && yesterdaySnap ? trendLabel(todaySnap.revenue, yesterdaySnap.revenue) : undefined;
  const ordersTrend = todaySnap && yesterdaySnap ? trendLabel(todaySnap.orders, yesterdaySnap.orders) : undefined;

  const overviewPoints = useMemo(() => {
    if (salesReport?.byDay?.length) {
      return salesReport.byDay.map((row) => ({
        label: row.label,
        orders: row.orderCount,
        revenue: moneyNumber(row.revenue),
      }));
    }
    return (revenue?.points ?? []).map((point) => ({
      label: point.label,
      orders: 0,
      revenue: moneyNumber(point.revenue),
    }));
  }, [revenue, salesReport]);

  const channelSlices = useMemo(
    () =>
      (summary?.salesChannels ?? [])
        .filter((row) => moneyNumber(row.revenue) > 0 || row.count > 0)
        .map((row, index) => ({
          key: row.source,
          label: statusLabel(row.source),
          value: moneyNumber(row.revenue),
          count: row.count,
          color: ['hsl(var(--erp-orange))', 'hsl(var(--erp-purple))', 'hsl(var(--erp-cyan))', 'hsl(var(--erp-lime))'][index % 4]!,
        })),
    [summary],
  );

  const channelTotal = channelSlices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Sales Overview</h2>
          <p className="mt-1 text-sm text-muted-foreground">Live store metrics from recognized sales and orders.</p>
        </div>
        <ReportFilters value={filters} onChange={setFilters} />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-3">
          {loading && !summary ? (
            <>
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </>
          ) : (
            <>
              {kpis?.revenue != null ? (
                <KpiCard
                  tone="peach"
                  label="Total Revenue"
                  value={formatMoney(kpis.revenue)}
                  hint={revenueTrend}
                  icon={<ShoppingBag className="h-5 w-5" />}
                />
              ) : null}
              {kpis?.orders != null ? (
                <KpiCard
                  tone="lavender"
                  label="Total Orders"
                  value={formatNumber(kpis.orders)}
                  hint={ordersTrend}
                  icon={<Package className="h-5 w-5" />}
                />
              ) : null}
              {customerTotal != null || kpis?.customers != null ? (
                <KpiCard
                  tone="mint"
                  label={customerTotal != null ? 'Total Customers' : 'New Customers'}
                  value={formatNumber(customerTotal ?? kpis?.customers ?? 0)}
                  hint={
                    kpis?.customers != null && customerTotal != null
                      ? `${formatNumber(kpis.customers)} new in period`
                      : undefined
                  }
                  icon={<Users className="h-5 w-5" />}
                />
              ) : null}
            </>
          )}

          <div className="erp-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Sales</h2>
              {revenueTrend ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  {revenueTrend}
                </span>
              ) : null}
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Total ({filters.preset.replaceAll('_', ' ')})</dt>
                <dd className="font-semibold tabular-nums">{formatMoney(kpis?.revenue)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">This Month</dt>
                <dd className="font-semibold tabular-nums">
                  {monthSnap ? formatMoney(monthSnap.revenue) : loading ? '…' : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Today</dt>
                <dd className="font-semibold tabular-nums">
                  {todaySnap ? formatMoney(todaySnap.revenue) : loading ? '…' : '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="erp-card p-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Orders Overview</h2>
            <p className="text-xs text-muted-foreground">Orders vs revenue</p>
          </div>
          {loading && overviewPoints.length === 0 ? (
            <Skeleton className="h-64 w-full rounded-2xl" />
          ) : (
            <OrdersOverviewChart points={overviewPoints} />
          )}
        </div>

        <div className="space-y-4">
          <div className="erp-card p-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Sale Analytics</h2>
              <p className="text-xs text-muted-foreground">By channel</p>
            </div>
            {loading && channelSlices.length === 0 ? (
              <Skeleton className="h-52 w-full rounded-2xl" />
            ) : (
              <SaleAnalyticsDonut
                slices={channelSlices}
                centerLabel={channelTotal > 0 ? formatMoney(channelTotal) : 'No sales'}
              />
            )}
          </div>

          <div className="erp-card overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="text-sm font-semibold">Top Products</h2>
              {auth.can('products.read') ? (
                <Button asChild variant="ghost" size="sm" className="rounded-full">
                  <Link href="/products">View all</Link>
                </Button>
              ) : null}
            </div>
            <div className="px-2 pb-2">
              <DataTable
                caption="Top selling products"
                rows={widgets?.topProducts ?? []}
                loading={loading}
                empty="No product sales in this period."
                columns={[
                  {
                    key: 'product',
                    header: 'Product',
                    render: (row) => (
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-xs font-semibold uppercase">
                          {row.productName.slice(0, 2)}
                        </div>
                        <span className="font-medium">{row.productName}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'code',
                    header: 'Code',
                    render: (row) => <span className="tabular-nums text-muted-foreground">{productCode(row.productId)}</span>,
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="erp-card p-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Purchase Analytics</h2>
            <p className="text-xs text-muted-foreground">Sold vs purchased</p>
          </div>
          {summary?.purchases.available === false && kpis?.revenue == null ? (
            <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Purchase analytics unavailable for your role.
            </p>
          ) : (
            <PurchaseAnalyticsChart
              sold={moneyNumber(kpis?.revenue)}
              purchased={moneyNumber(summary?.purchases.purchaseTotal)}
            />
          )}
        </div>

        <div className="erp-card p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Inventory alerts</h2>
            {auth.can('inventory.read') ? (
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link href="/inventory/low-stock">View inventory</Link>
              </Button>
            ) : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Low stock</p>
              <ul className="space-y-2 text-sm">
                {(widgets?.lowStock ?? []).map((row) => (
                  <li key={row.productVariantId}>
                    <Link href={`/inventory/${row.productVariantId}`} className="cursor-pointer hover:underline">
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
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Out of stock</p>
              <ul className="space-y-2 text-sm">
                {(widgets?.outOfStock ?? []).map((row) => (
                  <li key={row.productVariantId}>
                    <Link href={`/inventory/${row.productVariantId}`} className="cursor-pointer hover:underline">
                      {row.productName} / {row.variantLabel}
                    </Link>
                  </li>
                ))}
                {(widgets?.outOfStock ?? []).length === 0 ? <li className="text-muted-foreground">None</li> : null}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="erp-card overflow-hidden">
        <div className="px-5 pt-5">
          <h2 className="text-sm font-semibold">Recent sales</h2>
        </div>
        <div className="p-2">
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
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="erp-card overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="text-sm font-semibold">Recent orders</h2>
            {auth.can('orders.read') ? (
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link href="/orders">View orders</Link>
              </Button>
            ) : null}
          </div>
          <div className="p-2">
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
          </div>
        </div>

        <div className="erp-card p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Customers & purchasing</h2>
            <div className="flex gap-2">
              {auth.can('customers.read') ? (
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link href="/customers">CRM</Link>
                </Button>
              ) : null}
              {auth.can('purchases.read') ? (
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link href="/purchases">Purchasing</Link>
                </Button>
              ) : null}
            </div>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-2xl bg-muted/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Customers</p>
              <p className="mt-2">New {summary?.customers.newCustomers ?? 0}</p>
              <p>Repeat {summary?.customers.repeatCustomers ?? 0}</p>
              <p>High-value {summary?.customers.highValueCustomers ?? 0}</p>
              <p>Inactive {summary?.customers.inactiveCustomers ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-muted/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Purchases</p>
              <p className="mt-2">Count {summary?.purchases.purchaseCount ?? 0}</p>
              <p>Total {formatMoney(summary?.purchases.purchaseTotal)}</p>
              <p>Outstanding {formatMoney(summary?.purchases.outstandingSupplierBalance)}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Expenses by category</p>
              {(summary?.expensesByCategory ?? []).slice(0, 5).map((row) => (
                <div key={row.category} className="flex justify-between py-1">
                  <span>{row.category}</span>
                  <span className="tabular-nums">{formatMoney(row.amount)}</span>
                </div>
              ))}
              {(summary?.expensesByCategory ?? []).length === 0 ? (
                <p className="text-muted-foreground">No expenses in this period.</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
