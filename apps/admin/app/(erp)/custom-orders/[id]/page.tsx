'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, CardContent, Input, Label } from '@jersey-commerce/ui';
import { apiRequest, readAccessToken } from '@/lib/api';
import { getApiUrl } from '@/lib/env';
import { formatDateTime, formatMoney, statusLabel } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/data-table';
import { ConfirmAction, FormError, selectClassName } from '@/components/confirm-action';
import { useAuth } from '@/lib/auth';
import { useRouteParam } from '@/lib/use-route-param';

interface CustomOrderFile {
  id: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  kind: string;
  uploadedAt: string;
}

interface CustomOrderNote {
  id: string;
  body: string;
  createdBy: { id: string; name: string };
  createdAt: string;
}

interface CustomOrderTimelineItem {
  id: string;
  type: string;
  title: string;
  detail: string | null;
  createdAt: string;
}

interface CustomOrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  type: string;
  teamName: string | null;
  description: string | null;
  preferredJerseyType: string | null;
  preferredColours: string | null;
  customizationRequirements: string | null;
  notes: string | null;
  estimatedQuantity: number;
  requestedDeliveryDate: string | null;
  total: string;
  depositPaid: string;
  balanceDue: string;
  customer: { name: string; phone: string | null; email: string | null };
  items: Array<{ id: string; playerName: string | null; size: string | null; quantity: number; total: string }>;
  files: CustomOrderFile[];
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
  const id = useRouteParam('id');
  const isNew = id === 'new';
  const router = useRouter();
  const auth = useAuth();
  const [row, setRow] = useState<CustomOrderDetail | null>(null);
  const [timeline, setTimeline] = useState<CustomOrderTimelineItem[]>([]);
  const [notesList, setNotesList] = useState<CustomOrderNote[]>([]);
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
    const next = await apiRequest<CustomOrderDetail>(`/custom-orders/${id}`);
    setRow(next);
    setStatus(next.status);
    if (next.estimatedQuantity) {
      setQuantity(String(next.estimatedQuantity));
    }
    const [timelineResult, notesResult] = await Promise.all([
      apiRequest<{ items: CustomOrderTimelineItem[] } | CustomOrderTimelineItem[]>(`/custom-orders/${id}/timeline`).catch(
        () => ({ items: [] as CustomOrderTimelineItem[] }),
      ),
      apiRequest<{ items: CustomOrderNote[] } | CustomOrderNote[]>(`/custom-orders/${id}/notes`).catch(
        () => ({ items: [] as CustomOrderNote[] }),
      ),
    ]);
    setTimeline(Array.isArray(timelineResult) ? timelineResult : (timelineResult.items ?? []));
    setNotesList(Array.isArray(notesResult) ? notesResult : (notesResult.items ?? []));
  }

  useEffect(() => {
    if (!isNew) {
      load().catch((err: Error) => setError(err.message));
    }
  }, [isNew, id]);

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
      await apiRequest(`/custom-orders/${id}/quote`, {
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
      await apiRequest(`/custom-orders/${id}/deposit`, {
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
      await apiRequest(`/custom-orders/${id}/status`, {
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
      await apiRequest(`/custom-orders/${id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ body: noteBody.trim() }),
      });
      setNoteBody('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add note');
    } finally {
      setSaving(false);
    }
  }

  async function cancel(reason: string): Promise<void> {
    setSaving(true);
    try {
      await apiRequest(`/custom-orders/${id}/cancel`, {
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

  async function downloadFile(file: CustomOrderFile): Promise<void> {
    try {
      const token = readAccessToken();
      const response = await fetch(`${getApiUrl()}/api/v1/custom-orders/${id}/files/${file.id}`, {
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Unable to download file');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.originalFilename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to download file');
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
        description={`${row.customer.name} · ${statusLabel(row.type)}`}
        actions={<Badge variant="secondary">{statusLabel(row.status)}</Badge>}
      />
      <FormError>{error}</FormError>
      <p className="text-sm">
        Total {formatMoney(row.total)} · Deposit {formatMoney(row.depositPaid)} · Balance {formatMoney(row.balanceDue)}
      </p>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-2">
          <p className="text-sm font-medium md:col-span-2">Enquiry details</p>
          <Detail label="Customer" value={row.customer.name} />
          <Detail label="Phone" value={row.customer.phone} />
          <Detail label="Email" value={row.customer.email} />
          <Detail label="Team" value={row.teamName} />
          <Detail label="Quantity" value={row.estimatedQuantity ? String(row.estimatedQuantity) : null} />
          <Detail label="Type" value={statusLabel(row.type)} />
          <Detail label="Preferred style" value={row.preferredJerseyType} />
          <Detail label="Preferred colours" value={row.preferredColours} />
          <Detail label="Delivery date" value={row.requestedDeliveryDate ? formatDateTime(row.requestedDeliveryDate) : null} />
          <div className="md:col-span-2">
            <Detail label="Description" value={row.description} />
          </div>
          <div className="md:col-span-2">
            <Detail label="Customization requirements" value={row.customizationRequirements} />
          </div>
          <div className="md:col-span-2">
            <Detail label="Customer notes" value={row.notes} />
          </div>
          {row.files.length > 0 ? (
            <div className="md:col-span-2">
              <p className="text-xs text-muted-foreground">Design / reference files</p>
              <ul className="mt-1 space-y-1">
                {row.files.map((file) => (
                  <li key={file.id}>
                    <button
                      type="button"
                      className="text-sm text-primary underline-offset-2 hover:underline"
                      onClick={() => void downloadFile(file)}
                    >
                      {file.originalFilename}
                    </button>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {file.kind} · {Math.max(1, Math.round(file.fileSize / 1024))} KB
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

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
            {notesList.length > 0 ? (
              <ul className="mt-4 space-y-2 border-t border-border pt-3">
                {notesList.map((note) => (
                  <li key={note.id} className="text-sm">
                    <p>{note.body}</p>
                    <p className="text-xs text-muted-foreground">
                      {note.createdBy.name} · {formatDateTime(note.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {timeline.length > 0 ? (
        <Card>
          <CardContent className="p-4">
            <p className="mb-3 text-sm font-medium">Timeline</p>
            <ul className="space-y-2">
              {timeline.map((event) => (
                <li key={event.id} className="border-b border-border/60 pb-2 text-sm last:border-0">
                  <p className="font-medium">{event.title}</p>
                  {event.detail ? <p className="text-muted-foreground">{event.detail}</p> : null}
                  <p className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</p>
                </li>
              ))}
            </ul>
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

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{value?.trim() || '—'}</p>
    </div>
  );
}
