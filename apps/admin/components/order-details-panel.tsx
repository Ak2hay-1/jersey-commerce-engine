'use client';

import type { OrderDetail } from '@jersey-commerce/types';
import { Badge, Card, CardContent } from '@jersey-commerce/ui';
import { DataTable } from '@/components/data-table';
import { formatDateTime, formatMoney, statusLabel } from '@/lib/format';

function itemMeta(item: OrderDetail['items'][number]): string {
  return [item.size, item.color, item.sku].filter(Boolean).join(' · ');
}

export function OrderDetailsPanel({ order }: { order: OrderDetail }): React.JSX.Element {
  const address = order.shippingAddress;
  const shipment = order.shipment;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="secondary">{statusLabel(order.status)}</Badge>
        <Badge variant="outline">{statusLabel(order.paymentStatus)}</Badge>
        <Badge variant="outline">{statusLabel(order.fulfillmentMethod)}</Badge>
        <Badge variant="outline">{statusLabel(order.inventoryState)}</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-2 p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer</p>
            {order.customer ? (
              <>
                <p className="font-medium">{order.customer.name}</p>
                {order.customer.phone ? <p>{order.customer.phone}</p> : null}
                {order.customer.email ? <p className="text-muted-foreground">{order.customer.email}</p> : null}
              </>
            ) : (
              <p className="text-muted-foreground">Guest / no customer linked</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {order.fulfillmentMethod === 'STORE_PICKUP' ? 'Fulfillment' : 'Shipping address'}
            </p>
            {order.fulfillmentMethod === 'STORE_PICKUP' ? (
              <p>Store pickup</p>
            ) : address ? (
              <>
                <p className="font-medium">{address.fullName}</p>
                <p>{address.phone}</p>
                <p>{address.addressLine1}</p>
                {address.addressLine2 ? <p>{address.addressLine2}</p> : null}
                <p>
                  {address.city}, {address.state} {address.postalCode}
                </p>
                <p>{address.country}</p>
              </>
            ) : (
              <p className="text-muted-foreground">No shipping address</p>
            )}
          </CardContent>
        </Card>
      </div>

      <DataTable
        caption="Order items"
        rows={order.items}
        columns={[
          {
            key: 'name',
            header: 'Item',
            render: (item) => (
              <div>
                <p className="font-medium">{item.productName}</p>
                {itemMeta(item) ? <p className="text-xs text-muted-foreground">{itemMeta(item)}</p> : null}
              </div>
            ),
          },
          { key: 'qty', header: 'Qty', render: (item) => item.quantity },
          { key: 'unit', header: 'Unit', render: (item) => formatMoney(item.unitPrice, order.currency) },
          {
            key: 'disc',
            header: 'Discount',
            render: (item) => (Number(item.discount) > 0 ? formatMoney(item.discount, order.currency) : '—'),
          },
          {
            key: 'tax',
            header: 'Tax',
            render: (item) => (Number(item.tax) > 0 ? formatMoney(item.tax, order.currency) : '—'),
          },
          { key: 'total', header: 'Total', render: (item) => formatMoney(item.total, order.currency) },
        ]}
      />

      <Card>
        <CardContent className="grid gap-2 p-4 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2 sm:col-span-2">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatMoney(order.subtotal, order.currency)}</span>
          </div>
          <div className="flex justify-between gap-2 sm:col-span-2">
            <span className="text-muted-foreground">Discount</span>
            <span>{formatMoney(order.discount, order.currency)}</span>
          </div>
          <div className="flex justify-between gap-2 sm:col-span-2">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatMoney(order.tax, order.currency)}</span>
          </div>
          <div className="flex justify-between gap-2 sm:col-span-2">
            <span className="text-muted-foreground">Shipping</span>
            <span>{formatMoney(order.shippingAmount, order.currency)}</span>
          </div>
          <div className="flex justify-between gap-2 border-t pt-2 text-base font-semibold sm:col-span-2">
            <span>Total</span>
            <span>{formatMoney(order.total, order.currency)}</span>
          </div>
        </CardContent>
      </Card>

      {order.payments.length > 0 ? (
        <DataTable
          caption="Payments"
          rows={order.payments}
          columns={[
            { key: 'method', header: 'Method', render: (p) => statusLabel(p.method) },
            { key: 'status', header: 'Status', render: (p) => statusLabel(p.status) },
            { key: 'provider', header: 'Provider', render: (p) => p.provider ?? '—' },
            { key: 'ref', header: 'Reference', render: (p) => p.reference ?? '—' },
            { key: 'amount', header: 'Amount', render: (p) => formatMoney(p.amount, order.currency) },
            { key: 'at', header: 'When', render: (p) => formatDateTime(p.createdAt) },
          ]}
        />
      ) : (
        <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
      )}

      {shipment ? (
        <Card>
          <CardContent className="space-y-2 p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shipment</p>
            <p>
              {shipment.provider}
              {shipment.waybill ? ` · AWB ${shipment.waybill}` : ''}
            </p>
            {shipment.providerStatus ? <p>Status: {shipment.providerStatus}</p> : null}
            {shipment.codAmount && Number(shipment.codAmount) > 0 ? (
              <p>COD collect: {formatMoney(shipment.codAmount, order.currency)}</p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              {shipment.trackingUrl ? (
                <a className="underline" href={shipment.trackingUrl} target="_blank" rel="noreferrer">
                  Track
                </a>
              ) : null}
              {shipment.labelUrl ? (
                <a className="underline" href={shipment.labelUrl} target="_blank" rel="noreferrer">
                  Label
                </a>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {(order.notes || order.cancelReason) && (
        <Card>
          <CardContent className="space-y-1 p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
            {order.notes ? <p>{order.notes}</p> : null}
            {order.cancelReason ? <p className="text-muted-foreground">Cancel reason: {order.cancelReason}</p> : null}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        <p>Created {formatDateTime(order.createdAt)}</p>
        <p>Updated {formatDateTime(order.updatedAt)}</p>
        {order.confirmedAt ? <p>Confirmed {formatDateTime(order.confirmedAt)}</p> : null}
        {order.shippedAt ? <p>Shipped {formatDateTime(order.shippedAt)}</p> : null}
        {order.completedAt ? <p>Completed {formatDateTime(order.completedAt)}</p> : null}
        {order.cancelledAt ? <p>Cancelled {formatDateTime(order.cancelledAt)}</p> : null}
      </div>
    </div>
  );
}
