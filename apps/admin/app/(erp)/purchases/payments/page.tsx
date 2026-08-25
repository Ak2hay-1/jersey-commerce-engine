'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Button, Card, CardContent, Input, Label } from '@jersey-commerce/ui';
import { ResourceList } from '@/components/resource-list';
import { apiRequest, queryString } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { FormError, selectClassName } from '@/components/confirm-action';
import { useAuth } from '@/lib/auth';

interface PaymentRow {
  id: string;
  supplier?: { name: string } | null;
  amount: string;
  paymentMethod: string;
  createdAt: string;
  reference?: string | null;
}

interface SupplierRow {
  id: string;
  name: string;
}

export default function SupplierPaymentsPage(): React.JSX.Element {
  const auth = useAuth();
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    void apiRequest<{ items: SupplierRow[] } | SupplierRow[]>(`/suppliers${queryString({ page: 1, pageSize: 100 })}`).then(
      (result) => setSuppliers(Array.isArray(result) ? result : (result.items ?? [])),
    );
  }, []);

  async function onCreate(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiRequest('/supplier-payments', {
        method: 'POST',
        body: JSON.stringify({
          supplierId,
          amount,
          paymentMethod,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      setAmount('');
      setReference('');
      setNotes('');
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record payment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {auth.can('supplierPayments.create') ? (
        <Card>
          <CardContent className="p-4">
            <p className="mb-3 text-sm font-medium">Record supplier payment</p>
            <FormError>{error}</FormError>
            <form className="grid gap-3 md:grid-cols-3" onSubmit={(event) => void onCreate(event)}>
              <div>
                <Label htmlFor="supplier">Supplier</Label>
                <select id="supplier" className={selectClassName} value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
                  <option value="">Select</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" className="mt-1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="method">Method</Label>
                <select id="method" className={selectClassName} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <Label htmlFor="ref">Reference</Label>
                <Input id="ref" className="mt-1" value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save payment'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
      <ResourceList<PaymentRow>
        key={refreshKey}
        title="Supplier payments"
        path="/supplier-payments"
        columns={[
          { key: 'sup', header: 'Supplier', render: (row) => row.supplier?.name ?? '—' },
          { key: 'amt', header: 'Amount', render: (row) => formatMoney(row.amount) },
          { key: 'method', header: 'Method', render: (row) => row.paymentMethod },
          { key: 'ref', header: 'Reference', hideOnMobile: true, render: (row) => row.reference ?? '—' },
          { key: 'dt', header: 'Date', hideOnMobile: true, render: (row) => formatDateTime(row.createdAt) },
        ]}
      />
    </div>
  );
}
