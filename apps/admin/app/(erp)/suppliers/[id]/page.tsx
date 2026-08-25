'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, CardContent, Input, Label } from '@jersey-commerce/ui';
import { apiRequest } from '@/lib/api';
import { formatMoney, statusLabel } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { ConfirmAction, FormError, selectClassName } from '@/components/confirm-action';
import { useAuth } from '@/lib/auth';

interface SupplierDetail {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone: string | null;
  email: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  taxInformation?: string | null;
  notes?: string | null;
  status: string;
}

interface Balance {
  totalPurchases: string;
  totalPaid: string;
  outstandingAmount: string;
}

export default function SupplierDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const isNew = params.id === 'new';
  const router = useRouter();
  const auth = useAuth();
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [taxInformation, setTaxInformation] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    Promise.all([
      apiRequest<SupplierDetail>(`/suppliers/${params.id}`),
      apiRequest<Balance>(`/suppliers/${params.id}/balance`),
    ])
      .then(([row, nextBalance]) => {
        setSupplier(row);
        setBalance(nextBalance);
        setName(row.name);
        setContactPerson(row.contactPerson ?? '');
        setPhone(row.phone ?? '');
        setEmail(row.email ?? '');
        setAddress(row.address ?? '');
        setCity(row.city ?? '');
        setState(row.state ?? '');
        setPostalCode(row.postalCode ?? '');
        setTaxInformation(row.taxInformation ?? '');
        setNotes(row.notes ?? '');
        setStatus(row.status);
      })
      .catch((err: Error) => setError(err.message));
  }, [isNew, params.id]);

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError('');
    const body = {
      name: name.trim(),
      contactPerson: contactPerson.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      postalCode: postalCode.trim() || undefined,
      taxInformation: taxInformation.trim() || undefined,
      notes: notes.trim() || undefined,
      status,
    };
    try {
      if (isNew) {
        const created = await apiRequest<SupplierDetail>('/suppliers', { method: 'POST', body: JSON.stringify(body) });
        router.replace(`/suppliers/${created.id}`);
      } else {
        const updated = await apiRequest<SupplierDetail>(`/suppliers/${params.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        setSupplier(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save supplier');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(): Promise<void> {
    setSaving(true);
    try {
      await apiRequest(`/suppliers/${params.id}`, { method: 'DELETE' });
      router.replace('/suppliers');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete supplier');
      throw err;
    } finally {
      setSaving(false);
    }
  }

  const canSave = (isNew && auth.can('suppliers.create')) || (!isNew && auth.can('suppliers.update'));

  return (
    <div className="space-y-4">
      <PageHeader title={isNew ? 'Add supplier' : supplier?.name ?? 'Supplier'} description={supplier ? statusLabel(supplier.status) : undefined} />
      <FormError>{error}</FormError>
      {!isNew && balance ? (
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <p>Purchases {formatMoney(balance.totalPurchases)}</p>
          <p>Paid {formatMoney(balance.totalPaid)}</p>
          <p>Outstanding {formatMoney(balance.outstandingAmount)}</p>
        </div>
      ) : null}
      <Card>
        <CardContent className="p-4">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void onSubmit(event)}>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" className="mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="contact">Contact person</Label>
              <Input id="contact" className="mt-1" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" className="mt-1" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" className="mt-1" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" className="mt-1" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="postal">Postal code</Label>
              <Input id="postal" className="mt-1" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select id="status" className={selectClassName} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="tax">Tax information</Label>
              <Input id="tax" className="mt-1" value={taxInformation} onChange={(e) => setTaxInformation(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {canSave ? (
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>
      {!isNew && auth.can('suppliers.delete') ? (
        <ConfirmAction
          triggerLabel="Delete / deactivate"
          title="Remove this supplier?"
          description="Suppliers with purchase history are deactivated instead of deleted."
          confirmLabel="Confirm"
          disabled={saving}
          onConfirm={() => onDelete()}
        />
      ) : null}
    </div>
  );
}
