'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge } from '@jersey-commerce/ui';
import { apiRequest } from '@/lib/api';
import { formatMoney, statusLabel } from '@/lib/format';
import { PageHeader } from '@/components/page-header';

interface CustomerProfile {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  city: string | null;
  metrics?: { totalSpent: string; totalOrders: number; averageOrder: string };
  segments?: string[];
}

export default function CustomerDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    apiRequest<CustomerProfile>(`/customers/${params.id}`).then(setCustomer).catch((err: Error) => setError(err.message));
  }, [params.id]);
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!customer) return <p className="text-sm text-muted-foreground">Loading customer…</p>;
  return (
    <div className="space-y-4">
      <PageHeader title={customer.name} description={`${customer.phone ?? ''} · ${customer.email ?? ''}`} actions={<Badge variant="secondary">{statusLabel(customer.status)}</Badge>} />
      <div className="grid gap-2 text-sm sm:grid-cols-3">
        <p>Orders {customer.metrics?.totalOrders ?? 0}</p>
        <p>Spent {formatMoney(customer.metrics?.totalSpent)}</p>
        <p>AOV {formatMoney(customer.metrics?.averageOrder)}</p>
        <p>City {customer.city ?? '—'}</p>
        <p>Segments {(customer.segments ?? []).join(', ') || '—'}</p>
      </div>
    </div>
  );
}
