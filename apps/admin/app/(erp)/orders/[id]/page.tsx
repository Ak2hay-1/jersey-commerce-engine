'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, CardContent, Input, Label } from '@jersey-commerce/ui';
import type { OrderDetail, ProductListItem } from '@jersey-commerce/types';
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

  async function load(): Promise<void> {
    const next = await apiRequest<OrderDetail>(`/orders/${id}`);
    setOrder(next);
    setStatus(next.status);
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
    order.status === 'READY' &&
    !order.shipment;

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
          {order.shipment ? (
            <Button type="button" variant="outline" disabled={shipping} onClick={() => void onRefreshShipment()}>
              Refresh tracking
            </Button>
          ) : null}
          {auth.can('orders.cancel') ? (
            <ConfirmAction
              triggerLabel="Cancel order"
              title="Cancel this order?"
              requireReason
              confirmLabel="Cancel order"
              disabled={saving}
              onConfirm={(reason) => onCancel(reason)}
            />
          ) : null}
        </div>
      ) : null}
      <OrderDetailsPanel order={order} />
    </div>
  );
}
