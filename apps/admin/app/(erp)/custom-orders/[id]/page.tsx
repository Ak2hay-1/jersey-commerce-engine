'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge, Button, Card, CardContent, Input, Label } from '@jersey-commerce/ui';
import { apiRequest } from '@/lib/api';
import { formatMoney, statusLabel } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { ConfirmAction, FormError, selectClassName } from '@/components/confirm-action';
import { useAuth } from '@/lib/auth';

interface CustomOrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  type: string;
  total: string;
  depositPaid: string;
  balanceDue: string;
  customer: { name: string };
  items: Array<{ id: string; playerName: string | null; size: string | null; quantity: number; total: string }>;
}

const STATUSES = [
  'INQUIRY',
  'QUOTATION',
  'QUOTE_SENT',
  'CUSTOMER_APPROVAL',
  'DEPOSIT_PENDING',
  'CONFIRMED',
  'DESIGN_PENDING',
  'DESIGN_APPROVAL',
  'PRODUCTION',
  'READY',
  'COMPLETED',
  'CANCELLED',
];

export default function CustomOrderDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const isNew = params.id === 'new';
  const router = useRouter();
  const auth = useAuth();
  const [row, setRow] = useState<CustomOrderDetail | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [teamName, setTeamName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('INQUIRY');
  const [unitPrice, setUnitPrice] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('UPI');
  const [noteBody, setNoteBody] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load(): Promise<void> {
    const next = await apiRequest<CustomOrderDetail>(`/custom-orders/${params.id}`);
    setRow(next);
    setStatus(next.status);
  }

  useEffect(() => {
    if (!isNew) {
      load().catch((err: Error) => setError(err.message));
    }
  }, [isNew, params.id]);

  async function onCreate(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await apiRequest<CustomOrderDetail>('/custom-orders', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          teamName: teamName.trim() || undefined,
          quantity: Number(quantity) || undefined,
          description: description.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      router.replace(`/custom-orders/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create enquiry');
    } finally {
      setSaving(false);
    }
  }

  async function saveQuote(): Promise<void> {
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/custom-orders/${params.id}/quote`, {
        method: 'POST',
        body: JSON.stringify({ unitPrice, quantity: Number(quantity) || undefined }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save quote');
    } finally {
      setSaving(false);
    }
  }

  async function saveDeposit(): Promise<void> {
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/custom-orders/${params.id}/deposit`, {
        method: 'POST',
        body: JSON.stringify({ method: depositMethod, amount: depositAmount, confirmed: true }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record deposit');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(): Promise<void> {
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/custom-orders/${params.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update status');
    } finally {
      setSaving(false);
    }
  }

  async function addNote(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!noteBody.trim()) return;
    setSaving(true);
    try {
      await apiRequest(`/custom-orders/${params.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ body: noteBody.trim() }),
      });
      setNoteBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add note');
    } finally {
      setSaving(false);
    }
  }

  async function cancel(reason: string): Promise<void> {
    setSaving(true);
    try {
      await apiRequest(`/custom-orders/${params.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel');
      throw err;
    } finally {
      setSaving(false);
    }
  }

  if (isNew) {
    return (
      <div className="space-y-4">
        <PageHeader title="New custom enquiry" />
        <FormError>{error}</FormError>
        <Card>
          <CardContent className="p-4">
            <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void onCreate(event)}>
              <div>
                <Label htmlFor="name">Customer name</Label>
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
                <Label htmlFor="team">Team name</Label>
                <Input id="team" className="mt-1" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="qty">Quantity</Label>
                <Input id="qty" className="mt-1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="desc">Description</Label>
                <Input id="desc" className="mt-1" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              {auth.can('customOrders.create') ? (
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Create enquiry'}
                </Button>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!row && !error) return <p className="text-sm text-muted-foreground">Loading custom order…</p>;
  if (!row) return <FormError>{error}</FormError>;

  return (
    <div className="space-y-4">
      <PageHeader
        title={row.orderNumber}
        description={`${row.customer.name} · ${row.type}`}
        actions={<Badge variant="secondary">{statusLabel(row.status)}</Badge>}
      />
      <FormError>{error}</FormError>
      <p className="text-sm">
        Total {formatMoney(row.total)} · Deposit {formatMoney(row.depositPaid)} · Balance {formatMoney(row.balanceDue)}
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        {auth.can('customOrders.update') ? (
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-sm font-medium">Status</p>
              <select className={selectClassName} value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {statusLabel(value)}
                  </option>
                ))}
              </select>
              <Button type="button" disabled={saving} onClick={() => void updateStatus()}>
                Update status
              </Button>
            </CardContent>
          </Card>
        ) : null}
        {auth.can('customOrders.quote') ? (
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-sm font-medium">Quote</p>
              <div>
                <Label htmlFor="price">Unit price</Label>
                <Input id="price" className="mt-1" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="qqty">Quantity</Label>
                <Input id="qqty" className="mt-1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <Button type="button" disabled={saving || !unitPrice} onClick={() => void saveQuote()}>
                Save quote
              </Button>
            </CardContent>
          </Card>
        ) : null}
        {auth.can('customOrders.payment') ? (
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-sm font-medium">Deposit / payment</p>
              <div>
                <Label htmlFor="dep">Amount</Label>
                <Input id="dep" className="mt-1" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="dmethod">Method</Label>
                <select id="dmethod" className={selectClassName} value={depositMethod} onChange={(e) => setDepositMethod(e.target.value)}>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="ONLINE">Online</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <Button type="button" disabled={saving || !depositAmount} onClick={() => void saveDeposit()}>
                Record payment
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {auth.can('customOrders.update') ? (
        <Card>
          <CardContent className="p-4">
            <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => void addNote(event)}>
              <div className="min-w-[16rem] flex-1">
                <Label htmlFor="note">Internal note</Label>
                <Input id="note" className="mt-1" value={noteBody} onChange={(e) => setNoteBody(e.target.value)} />
              </div>
              <Button type="submit" disabled={saving}>
                Add note
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {row.status !== 'CANCELLED' && auth.can('customOrders.update') ? (
        <ConfirmAction
          triggerLabel="Cancel custom order"
          title="Cancel this custom order?"
          requireReason
          confirmLabel="Cancel"
          disabled={saving}
          onConfirm={(reason) => cancel(reason)}
        />
      ) : null}

      <DataTable
        caption="Custom order items"
        rows={row.items}
        columns={[
          { key: 'player', header: 'Player', render: (item) => item.playerName ?? '—' },
          { key: 'size', header: 'Size', render: (item) => item.size ?? '—' },
          { key: 'qty', header: 'Qty', render: (item) => item.quantity },
          { key: 'total', header: 'Total', render: (item) => formatMoney(item.total) },
        ]}
      />
    </div>
  );
}
