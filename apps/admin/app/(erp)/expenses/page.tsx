'use client';

import Link from 'next/link';
import { Badge, Button } from '@jersey-commerce/ui';
import { ResourceList } from '@/components/resource-list';
import { formatDate, formatMoney, statusLabel } from '@/lib/format';
import { useAuth } from '@/lib/auth';

interface ExpenseRow {
  id: string;
  category: { name: string };
  amount: string;
  expenseDate: string;
  paymentMethod: string;
  status: string;
  description: string | null;
}

export default function ExpensesPage(): React.JSX.Element {
  const auth = useAuth();
  return (
    <ResourceList<ExpenseRow>
      title="Expenses"
      description="Operating expenses. Voiding preserves history."
      path="/expenses"
      rowHref={(row) => `/expenses/${row.id}`}
      actions={
        auth.can('expenses.create') ? (
          <Button asChild>
            <Link href="/expenses/new">Record expense</Link>
          </Button>
        ) : null
      }
      columns={[
        { key: 'date', header: 'Date', render: (row) => formatDate(row.expenseDate) },
        { key: 'cat', header: 'Category', render: (row) => row.category.name },
        { key: 'amt', header: 'Amount', render: (row) => formatMoney(row.amount) },
        { key: 'pay', header: 'Payment', hideOnMobile: true, render: (row) => row.paymentMethod },
        { key: 'st', header: 'Status', render: (row) => <Badge variant="secondary">{statusLabel(row.status)}</Badge> },
        { key: 'desc', header: 'Description', hideOnMobile: true, render: (row) => row.description ?? '—' },
      ]}
    />
  );
}
