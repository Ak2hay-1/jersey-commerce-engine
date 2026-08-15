'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { formatMoney, statusLabel } from '@/lib/format';
import { PageHeader } from '@/components/page-header';

interface SupplierDetail {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  city?: string | null;
}

interface Balance {
  totalPurchases: string;
  totalPaid: string;
  outstandingAmount: string;
}

export default function SupplierDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([apiRequest<SupplierDetail>(`/suppliers/${params.id}`), apiRequest<Balance>(`/suppliers/${params.id}/balance`)])
      .then(([next, nextBalance]) => {
        setSupplier(next);
        setBalance(nextBalance);
      })
      .catch((err: Error) => setError(err.message));
  }, [params.id]);
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!supplier) return <p className="text-sm text-muted-foreground">Loading supplier…</p>;
  return (
    <div className="space-y-4">
      <PageHeader title={supplier.name} description={`${supplier.contactPerson ?? ''} · ${statusLabel(supplier.status)}`} />
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <p>Phone {supplier.phone ?? '—'}</p>
        <p>Email {supplier.email ?? '—'}</p>
        <p>Purchases {formatMoney(balance?.totalPurchases)}</p>
        <p>Paid {formatMoney(balance?.totalPaid)}</p>
        <p>Outstanding {formatMoney(balance?.outstandingAmount)}</p>
      </div>
    </div>
  );
}
