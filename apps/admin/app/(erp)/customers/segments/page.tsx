'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@jersey-commerce/ui';
import type { CustomerDashboardSummary, TopCustomerRow } from '@jersey-commerce/types';
import { apiRequest } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { PageHeader } from '@/components/page-header';

export default function CustomerSegmentsPage(): React.JSX.Element {
  const [summary, setSummary] = useState<CustomerDashboardSummary | null>(null);
  const [top, setTop] = useState<TopCustomerRow[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([
      apiRequest<CustomerDashboardSummary>('/customers/summary'),
      apiRequest<{ items: TopCustomerRow[] }>('/customers/top?pageSize=8'),
    ])
      .then(([nextSummary, nextTop]) => {
        setSummary(nextSummary);
        setTop(nextTop.items);
      })
      .catch((err: Error) => setError(err.message));
  }, []);
  return (
    <div className="space-y-4">
      <PageHeader title="Customer segments" description="Derived from completed purchases. Thresholds are tenant CRM settings." />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="p-4"><CardTitle className="text-sm">New this period</CardTitle></CardHeader><CardContent className="p-4 pt-0 text-2xl font-semibold">{summary?.newInPeriod ?? 0}</CardContent></Card>
        <Card><CardHeader className="p-4"><CardTitle className="text-sm">Repeat</CardTitle></CardHeader><CardContent className="p-4 pt-0 text-2xl font-semibold">{summary?.repeatCustomers ?? 0}</CardContent></Card>
        <Card><CardHeader className="p-4"><CardTitle className="text-sm">High-value</CardTitle></CardHeader><CardContent className="p-4 pt-0 text-2xl font-semibold">{summary?.highValueCustomers ?? 0}</CardContent></Card>
        <Card><CardHeader className="p-4"><CardTitle className="text-sm">Inactive</CardTitle></CardHeader><CardContent className="p-4 pt-0 text-2xl font-semibold">{summary?.inactiveCustomers ?? 0}</CardContent></Card>
      </div>
      <Card>
        <CardHeader className="p-4"><CardTitle className="text-sm">Top customers</CardTitle></CardHeader>
        <CardContent className="space-y-2 p-4 pt-0 text-sm">
          {top.map((row) => (
            <div key={row.customer.id} className="flex justify-between">
              <Link href={`/customers/${row.customer.id}`} className="hover:underline">{row.customer.name}</Link>
              <span>{formatMoney(row.totalSpent)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
