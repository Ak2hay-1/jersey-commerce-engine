'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, CardContent, Input, Label } from '@jersey-commerce/ui';
import type { OrderDetail, ProductListItem, WhatsappReceiptStatus } from '@jersey-commerce/types';
import { apiRequest, queryString } from '@/lib/api';
import { formatDateTime, statusLabel } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { ConfirmAction, FormError, selectClassName } from '@/components/confirm-action';
import { OrderDetailsPanel } from '@/components/order-details-panel';
import { useAuth } from '@/lib/auth';
import { useRouteParam } from '@/lib/use-route-param';

interface VariantOption {
  id: string;
  label: string;
}

const STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'RETURNED', 'REFUNDED'];

export default function OrderDetailPage(): React.JSX.Element {
  const id = useRouteParam('id');
  const isNew = id === 'new';
  const router = useRouter();
  const auth = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [source, setSource] = useState('MANUAL');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('PENDING');
  const [lines, setLines] = useState([{ productVariantId: '', quantity: '1' }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [shipping, setShipping] = useState(false);
  const [waStatus, setWaStatus] = useState<WhatsappReceiptStatus | null>(null);
  const [waSending, setWaSending] = useState(false);
  const [waNotice, setWaNotice] = useState('');
  const [returnRestock, setReturnRestock] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentReference, setPaymentReference] = useState('');

  async function load(): Promise<void> {
    const next = await apiRequest<OrderDetail>(`/orders/${id}`);
    setOrder(next);
    setStatus(next.status);
    void apiRequest<WhatsappReceiptStatus>(`/orders/${id}/whatsapp-receipt`)
      .then(setWaStatus)
      .catch(() => setWaStatus(null));
  }

  async function onSendWhatsappReceipt(): Promise<void> {
    setWaSending(true);
    setError('');
    setWaNotice('');
    try {
      const result = await apiRequest<WhatsappReceiptStatus>(`/orders/${id}/whatsapp-receipt`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setWaStatus(result);
      setWaNotice(`Bill sent on WhatsApp to ${result.phone ?? 'customer'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send WhatsApp receipt');
      void apiRequest<WhatsappReceiptStatus>(`/orders/${id}/whatsapp-receipt`)
        .then(setWaStatus)
        .catch(() => undefined);
    } finally {
      setWaSending(false);
    }
  }

  useEffect(() => {
    void apiRequest<{ items: ProductListItem[] } | ProductListItem[]>(
      `/products${queryString({ page: 1, pageSize: 50, status: 'ACTIVE' })}`,
    ).then(async (result) => {
      const products = Array.isArray(result) ? result : (result.items ?? []);
      const options: VariantOption[] = [];
      for (const product of products.slice(0, 30)) {
        try {
          const detail = await apiRequest<{
            name: string;
            variants: Array<{ id: string; sku: string; size: string | null; colour: string | null }>;
          }>(`/products/${product.id}`);
          for (const variant of detail.variants) {
            options.push({
              id: variant.id,
              label: `${detail.name} · ${variant.size ?? '—'} ${variant.colour ?? ''} (${variant.sku})`.trim(),
            });
          }
        } catch {
          /* skip */
        }
      }
      setVariants(options);
    });
    if (!isNew) {
      load().catch((err: Error) => setError(err.message));
    }
  }, [isNew, id]);

  async function onCreate(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await apiRequest<OrderDetail>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          source,
          notes: notes.trim() || undefined,
          customer: customerName.trim()
            ? { name: customerName.trim(), phone: customerPhone.trim() || undefined }
            : undefined,
          items: lines
            .filter((line) => line.productVariantId)
            .map((line) => ({ productVariantId: line.productVariantId, quantity: Number(line.quantity) })),
        }),
      });
      router.replace(`/orders/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create order');
    } finally {
      setSaving(false);
    }
  }

  async function onStatus(): Promise<void> {
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update status');
    } finally {
      setSaving(false);
    }
  }

  async function onCancel(reason: string): Promise<void> {
    setSaving(true);
    try {
      await apiRequest(`/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel order');
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function onReturn(reason: string): Promise<void> {
    setError('');
    await apiRequest(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'RETURNED', reason, restock: returnRestock }),
    });
    await load();
  }

  async function onRefund(reason: string): Promise<void> {
    setError('');
    await apiRequest(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'REFUNDED', reason }),
    });
    await load();
  }

  async function onRecordPayment(): Promise<void> {
    setError('');
    await apiRequest('/payments', {
      method: 'POST',
      body: JSON.stringify({
        orderId: order?.id,
        method: paymentMethod,
        reference: paymentReference.trim() || undefined,
        confirmed: true,
      }),
    });
    setPaymentReference('');
    await load();
  }

  async function onCreateShipment(): Promise<void> {
    setShipping(true);
    setError('');
    try {
      await apiRequest(`/orders/${id}/shipments`, { method: 'POST', body: JSON.stringify({}) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create Delhivery shipment');
    } finally {
      setShipping(false);
    }
  }

  async function onRefreshShipment(): Promise<void> {
    setShipping(true);
    setError('');
    try {
      await apiRequest(`/orders/${id}/shipments/refresh`, { method: 'POST', body: JSON.stringify({}) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh shipment');
    } finally {
      setShipping(false);
    }
  }

  if (isNew) {
    return (
      <div className="space-y-4">
        <PageHeader title="Create order" description="Manual or WhatsApp order (not POS)." />
        <FormError>{error}</FormError>
        <Card>
          <CardContent className="p-4">
            <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void onCreate(event)}>
              <div>
                <Label htmlFor="source">Source</Label>
                <select id="source" className={selectClassName} value={source} onChange={(e) => setSource(e.target.value)}>
                  <option value="MANUAL">Manual</option>
                  <option value="WHATSAPP">WhatsApp</option>
                </select>
              </div>
              <div>
                <Label htmlFor="cname">Customer name</Label>
                <Input id="cname" className="mt-1" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="cphone">Customer phone</Label>
                <Input id="cphone" className="mt-1" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Items</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => setLines((rows) => [...rows, { productVariantId: '', quantity: '1' }])}>
                    Add line
                  </Button>
                </div>
                {lines.map((line, index) => (
                  <div key={index} className="grid gap-2 md:grid-cols-[1fr_6rem]">
                    <select
                      className={selectClassName}
                      value={line.productVariantId}
                      onChange={(e) =>
                        setLines((rows) => rows.map((row, i) => (i === index ? { ...row, productVariantId: e.target.value } : row)))
                      }
                      required
                    >
                      <option value="">Variant</option>
                      {variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {variant.label}
                        </option>
                      ))}
                    </select>
                    <Input
                      value={line.quantity}
                      onChange={(e) =>
                        setLines((rows) => rows.map((row, i) => (i === index ? { ...row, quantity: e.target.value } : row)))
                      }
                    />
                  </div>
                ))}
              </div>
              {auth.can('orders.create') ? (
                <Button type="submit" disabled={saving}>
                  {saving ? 'Creating…' : 'Create order'}
                </Button>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order && !error) return <p className="text-sm text-muted-foreground">Loading order…</p>;
  if (!order) return <FormError>{error}</FormError>;

  const canShip =
    auth.can('orders.update') &&
    order.fulfillmentMethod === 'DELIVERY' &&
    ['CONFIRMED', 'PROCESSING', 'READY'].includes(order.status) &&
    !(order.shipments?.length || order.shipment);
  const canRefundMoney = auth.can('payments.refund') || auth.can('sales.refund');
  const canReturn = auth.can('orders.update') && ['SHIPPED', 'COMPLETED'].includes(order.status);
  const canRefund = canRefundMoney && ['COMPLETED', 'RETURNED'].includes(order.status);
  const canRecordPayment =
    auth.can('payments.create') &&
    order.paymentStatus === 'PENDING' &&
    !['CANCELLED', 'REFUNDED'].includes(order.status);
  const isPaid = order.paymentStatus === 'COMPLETED';

  return (
    <div className="space-y-4">
      <PageHeader
        title={order.orderNumber}
        description={`${order.source} · ${order.customer?.name ?? 'Guest'} · ${formatDateTime(order.createdAt)}`}
        actions={<Badge variant="secondary">{statusLabel(order.status)}</Badge>}
      />
      <FormError>{error}</FormError>
      {auth.can('orders.update') && order.status !== 'CANCELLED' ? (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label htmlFor="status">Status</Label>
            <select id="status" className={selectClassName} value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {statusLabel(value)}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" disabled={saving} onClick={() => void onStatus()}>
            Update status
          </Button>
          {canShip ? (
            <Button type="button" disabled={shipping} onClick={() => void onCreateShipment()}>
              {shipping ? 'Creating…' : 'Create Delhivery shipment'}
            </Button>
          ) : null}
          {order.shipments?.length || order.shipment ? (
            <Button type="button" variant="outline" disabled={shipping} onClick={() => void onRefreshShipment()}>
              Refresh tracking
            </Button>
          ) : null}
          {auth.can('orders.cancel') && (!isPaid || canRefundMoney) ? (
            <ConfirmAction
              triggerLabel="Cancel order"
              title="Cancel this order?"
              description={
                isPaid
                  ? 'This order is paid. Online (Razorpay) payments are refunded automatically; cash, UPI, bank or COD payments are marked refunded and must be returned to the customer manually.'
                  : 'Reserved stock is released back to inventory.'
              }
              requireReason
              confirmLabel={isPaid ? 'Cancel and refund' : 'Cancel order'}
              disabled={saving}
              onConfirm={(reason) => onCancel(reason)}
            />
          ) : null}
        </div>
      ) : null}
      {canReturn || canRefund ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
          <span className="font-medium">Returns & refunds:</span>
          {canReturn ? (
            <>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={returnRestock} onChange={(e) => setReturnRestock(e.target.checked)} />
                Restock returned items
              </label>
              <ConfirmAction
                triggerLabel="Mark returned"
                title="Mark this order as returned?"
                description={
                  returnRestock
                    ? 'Returned items go back into sellable stock.'
                    : 'Returned items are written off as damaged and do not go back into stock.'
                }
                requireReason
                variant="outline"
                confirmLabel="Mark returned"
                onConfirm={(reason) => onReturn(reason)}
              />
            </>
          ) : null}
          {canRefund ? (
            <ConfirmAction
              triggerLabel="Refund order"
              title={`Refund ${order.orderNumber}?`}
              description="Online (Razorpay) payments are refunded to the customer automatically. Cash, UPI, bank or COD payments are marked refunded and must be returned manually."
              requireReason
              confirmLabel="Refund"
              onConfirm={(reason) => onRefund(reason)}
            />
          ) : null}
        </div>
      ) : null}
      {canRecordPayment ? (
        <div className="flex flex-wrap items-end gap-2 rounded-md border border-border px-3 py-2 text-sm">
          <div>
            <Label htmlFor="pay-method">Record payment</Label>
            <select
              id="pay-method"
              className={selectClassName}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="BANK_TRANSFER">Bank transfer</option>
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="COD">COD remittance</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <Label htmlFor="pay-ref">Reference</Label>
            <Input
              id="pay-ref"
              className="mt-1"
              value={paymentReference}
              placeholder="UTR / transaction id"
              onChange={(e) => setPaymentReference(e.target.value)}
            />
          </div>
          <ConfirmAction
            triggerLabel="Mark paid"
            title={`Record full payment for ${order.orderNumber}?`}
            description="Use this only after the money has reached the shop. The full order total is recorded."
            variant="outline"
            confirmLabel="Record payment"
            onConfirm={() => onRecordPayment()}
          />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
        <span className="font-medium">WhatsApp bill:</span>
        {waStatus?.status === 'SENT' ? (
          <Badge variant="secondary">Sent to {waStatus.phone}</Badge>
        ) : waStatus?.status === 'FAILED' || waStatus?.status === 'SKIPPED' ? (
          <>
            <Badge variant="outline">{waStatus.status === 'FAILED' ? 'Failed' : 'Not sent'}</Badge>
            {waStatus.error ? <span className="text-xs text-destructive">{waStatus.error}</span> : null}
          </>
        ) : (
          <span className="text-muted-foreground">Not sent yet</span>
        )}
        {auth.can('orders.update') && order.status !== 'CANCELLED' ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="ml-auto"
            disabled={waSending}
            onClick={() => void onSendWhatsappReceipt()}
          >
            {waSending ? 'Sending…' : waStatus?.status === 'SENT' ? 'Resend WhatsApp bill' : 'Send WhatsApp bill'}
          </Button>
        ) : null}
        {waNotice ? <span className="w-full text-xs text-emerald-700">{waNotice}</span> : null}
      </div>
      <OrderDetailsPanel order={order} />
    </div>
  );
}
