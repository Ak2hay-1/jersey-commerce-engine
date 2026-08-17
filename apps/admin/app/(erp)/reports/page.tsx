'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@jersey-commerce/ui';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/lib/auth';

const REPORTS = [
  { href: '/reports/sales', label: 'Sales', permission: 'reports.read' as const, blurb: 'Revenue, COGS, gross profit, and margin.' },
  { href: '/reports/inventory', label: 'Inventory', permission: 'inventory.read' as const, blurb: 'Stock, reserved, available, and valuation.' },
  { href: '/reports/purchases', label: 'Purchases', permission: 'purchases.read' as const, blurb: 'Supplier purchases and outstanding balances.' },
  { href: '/reports/customers', label: 'Customers', permission: 'customers.read' as const, blurb: 'New, repeat, high-value, and inactive customers.' },
  { href: '/reports/payments', label: 'Payments', permission: 'payments.read' as const, blurb: 'Cash, UPI, card, online, and refunds.' },
  { href: '/reports/expenses', label: 'Expenses', permission: 'expenses.read' as const, blurb: 'Operating expenses by category.' },
  { href: '/reports/custom-orders', label: 'Custom orders', permission: 'customOrders.read' as const, blurb: 'Enquiries, quotes, production, and balances.' },
];

export default function ReportsIndexPage(): React.JSX.Element {
  const auth = useAuth();
  return (
    <div className="space-y-4">
      <PageHeader title="Reports" description="Tenant-scoped reports from live ledgers. Gross profit is not net profit." />
      <div className="grid gap-3 md:grid-cols-2">
        {REPORTS.filter((report) => auth.can(report.permission)).map((report) => (
          <Link key={report.href} href={report.href}>
            <Card className="h-full hover:bg-muted/40">
              <CardHeader className="p-4">
                <CardTitle className="text-sm">{report.label}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 text-sm text-muted-foreground">{report.blurb}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
