'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, CardContent, Input, Label } from '@jersey-commerce/ui';
import { apiRequest } from '@/lib/api';
import { formatMoney, statusLabel } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { ConfirmAction, FormError, selectClassName } from '@/components/confirm-action';
import { useAuth } from '@/lib/auth';
import { useRouteParam } from '@/lib/use-route-param';

interface CustomerProfile {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address?: string | null;
  city: string | null;
  state?: string | null;
  postalCode?: string | null;
  notes?: string | null;
  status: string;
  metrics?: { totalSpent: string; totalOrders: number; averageOrder: string };
  segments?: string[];
}

export default function CustomerDetailPage(): React.JSX.Element {
  const id = useRouteParam('id');
  const isNew = id === 'new';
  const router = useRouter();
  const auth = useAuth();
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [noteBody, setNoteBody] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load(): Promise<void> {
    const row = await apiRequest<CustomerProfile>(`/customers/${id}`);
    setCustomer(row);
    setName(row.name);
    setPhone(row.phone ?? '');
    setEmail(row.email ?? '');
    setAddress(row.address ?? '');
    setCity(row.city ?? '');
    setState(row.state ?? '');
    setPostalCode(row.postalCode ?? '');
    setNotes(row.notes ?? '');
    setStatus(row.status);
  }

  useEffect(() => {
    if (isNew) return;
    load().catch((err: Error) => setError(err.message));
  }, [isNew, id]);

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError('');
    const body = {
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      postalCode: postalCode.trim() || undefined,
      notes: notes.trim() || undefined,
      status,
    };
    try {
      if (isNew) {
        const created = await apiRequest<CustomerProfile>('/customers', { method: 'POST', body: JSON.stringify(body) });
        router.replace(`/customers/${created.id}`);
      } else {
        await apiRequest(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save customer');
    } finally {
      setSaving(false);
    }
  }

  async function onArchive(): Promise<void> {
    setSaving(true);
    try {
      await apiRequest(`/customers/${id}`, { method: 'DELETE' });
      router.replace('/customers');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to archive customer');
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function addNote(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!noteBody.trim()) return;
    setSaving(true);
    try {
      await apiRequest(`/customers/${id}/notes`, { method: 'POST', body: JSON.stringify({ body: noteBody.trim() }) });
      setNoteBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add note');
    } finally {
      setSaving(false);
    }
  }

  const canSave = (isNew && auth.can('customers.create')) || (!isNew && auth.can('customers.update'));

  return (
    <div className="space-y-4">
      <PageHeader
        title={isNew ? 'Add customer' : customer?.name ?? 'Customer'}
        description={!isNew ? `${customer?.phone ?? ''} · ${customer?.email ?? ''}` : undefined}
        actions={!isNew ? <Badge variant="secondary">{statusLabel(customer?.status ?? status)}</Badge> : undefined}
      />
      <FormError>{error}</FormError>
      {!isNew && customer?.metrics ? (
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <p>Orders {customer.metrics.totalOrders}</p>
          <p>Spent {formatMoney(customer.metrics.totalSpent)}</p>
          <p>AOV {formatMoney(customer.metrics.averageOrder)}</p>
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
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
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
      {!isNew && auth.can('customers.update') ? (
        <Card>
          <CardContent className="p-4">
            <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => void addNote(event)}>
              <div className="min-w-[16rem] flex-1">
                <Label htmlFor="note">Add timeline note</Label>
                <Input id="note" className="mt-1" value={noteBody} onChange={(e) => setNoteBody(e.target.value)} />
              </div>
              <Button type="submit" disabled={saving}>
                Add note
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
      {!isNew && auth.can('customers.delete') ? (
        <ConfirmAction
          triggerLabel="Archive customer"
          title="Archive this customer?"
          description="Customers with order history are deactivated. History is kept."
          confirmLabel="Archive"
          disabled={saving}
          onConfirm={() => onArchive()}
        />
      ) : null}
    </div>
  );
}
