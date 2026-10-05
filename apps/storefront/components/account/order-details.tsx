import type { ReactNode } from 'react';
import type { OrderDetail, OrderShipmentDto } from '@jersey-commerce/types';
import { ExternalLink } from 'lucide-react';
import { formatMoney } from '../../lib/format';
import { OrderStatus, OrderStatusBadge, nextStepCopy } from './order-status';

function money(amount: string, currency: string): string {
  return formatMoney(amount, currency);
}

function label(value: string): string {
  return value.replaceAll('_', ' ');
}

function itemMeta(item: OrderDetail['items'][number]): string {
  const parts = [item.size, item.color, item.sku ? `SKU ${item.sku}` : null].filter(Boolean);
  return parts.join(' · ');
}

function Panel({ title, children }: { title: string; children: ReactNode }): React.JSX.Element {
  return (
    <section className="panel space-y-3 p-5 sm:p-6">
      <h2 className="text-micro text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function ShipmentBlock({
  shipment,
}: {
  shipment: OrderShipmentDto | null | undefined;
}): React.JSX.Element | null {
  if (!shipment) {
    return null;
  }
  return (
    <Panel title="Shipment">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Carrier</dt>
          <dd className="font-medium">{shipment.provider}</dd>
        </div>
        {shipment.waybill ? (
          <div>
            <dt className="text-muted-foreground">AWB</dt>
            <dd className="font-medium">{shipment.waybill}</dd>
          </div>
        ) : null}
        {shipment.providerStatus ? (
          <div>
            <dt className="text-muted-foreground">Carrier status</dt>
            <dd className="font-medium">{shipment.providerStatus}</dd>
          </div>
        ) : null}
      </dl>
      {shipment.trackingUrl ? (
        <a href={shipment.trackingUrl} target="_blank" rel="noreferrer" className="btn btn-secondary mt-1 cursor-pointer">
          Track on Delhivery
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      ) : null}
    </Panel>
  );
}

export function OrderDetailsPanel({
  order,
  currency,
}: {
  order: OrderDetail;
  currency: string;
}): React.JSX.Element {
  const address = order.shippingAddress;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <OrderStatusBadge status={order.status} />
        <span className="text-sm text-muted-foreground">
          Payment: {label(order.paymentState)} · {order.fulfillmentMethod === 'STORE_PICKUP' ? 'Store pickup' : 'Delivery'}
        </span>
      </div>
      <p className="text-sm text-foreground/80">{nextStepCopy(order)}</p>
      <OrderStatus order={order} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <Panel title="Items">
            <ul className="divide-y divide-white/[0.08]">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="break-words font-medium">
                      {item.productName} × {item.quantity}
                    </p>
                    {itemMeta(item) ? <p className="mt-0.5 text-muted-foreground">{itemMeta(item)}</p> : null}
                    <p className="mt-0.5 text-muted-foreground">
                      {money(item.unitPrice, currency)} each
                      {Number(item.discount) > 0 ? ` · disc. ${money(item.discount, currency)}` : ''}
                    </p>
                  </div>
                  <span className="tabular shrink-0 font-medium">{money(item.total, currency)}</span>
                </li>
              ))}
            </ul>
          </Panel>

          {order.payments.length > 0 ? (
            <Panel title="Payments">
              <ul className="divide-y divide-white/[0.08] text-sm">
                {order.payments.map((payment) => (
                  <li key={payment.id} className="flex justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="font-medium">
                        {label(payment.method)} · {label(payment.status)}
                      </p>
                      {payment.reference ? <p className="text-muted-foreground">Ref {payment.reference}</p> : null}
                      {payment.provider ? <p className="text-muted-foreground">{payment.provider}</p> : null}
                    </div>
                    <span className="tabular shrink-0">{money(payment.amount, currency)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <ShipmentBlock shipment={order.shipment} />

          {order.notes || order.cancelReason ? (
            <Panel title="Notes">
              {order.notes ? <p className="text-sm">{order.notes}</p> : null}
              {order.cancelReason ? <p className="text-sm text-muted-foreground">Cancel reason: {order.cancelReason}</p> : null}
            </Panel>
          ) : null}
        </div>

        <div className="space-y-5">
          <Panel title="Totals">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular">{money(order.subtotal, currency)}</dd>
              </div>
              {Number(order.discount) > 0 ? (
                <div className="flex justify-between gap-3 text-emerald-300">
                  <dt>Discount</dt>
                  <dd className="tabular">−{money(order.discount, currency)}</dd>
                </div>
              ) : null}
              {Number(order.tax) > 0 ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Tax</dt>
                  <dd className="tabular">{money(order.tax, currency)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd className="tabular">{Number(order.shippingAmount) > 0 ? money(order.shippingAmount, currency) : 'Free'}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-white/10 pt-3">
                <dt className="font-heading text-lg uppercase tracking-wide">Total</dt>
                <dd className="tabular font-heading text-2xl font-bold">{money(order.total, currency)}</dd>
              </div>
            </dl>
          </Panel>

          {order.customer ? (
            <Panel title="Customer">
              <div className="text-sm">
                <p className="font-medium">{order.customer.name}</p>
                {order.customer.phone ? <p className="text-muted-foreground">{order.customer.phone}</p> : null}
                {order.customer.email ? <p className="text-muted-foreground">{order.customer.email}</p> : null}
              </div>
            </Panel>
          ) : null}

          <Panel title={order.fulfillmentMethod === 'STORE_PICKUP' ? 'Fulfillment' : 'Shipping address'}>
            {order.fulfillmentMethod === 'STORE_PICKUP' ? (
              <p className="text-sm">Store pickup</p>
            ) : address ? (
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{address.fullName}</p>
                <p>{address.phone}</p>
                <p>{address.addressLine1}</p>
                {address.addressLine2 ? <p>{address.addressLine2}</p> : null}
                <p>
                  {address.city}, {address.state} {address.postalCode}
                </p>
                <p>{address.country}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No address on file</p>
            )}
          </Panel>

          <div className="grid gap-1 px-1 text-xs text-muted-foreground">
            <p>Placed {new Date(order.createdAt).toLocaleString('en-IN')}</p>
            {order.confirmedAt ? <p>Confirmed {new Date(order.confirmedAt).toLocaleString('en-IN')}</p> : null}
            {order.shippedAt ? <p>Shipped {new Date(order.shippedAt).toLocaleString('en-IN')}</p> : null}
            {order.completedAt ? <p>Completed {new Date(order.completedAt).toLocaleString('en-IN')}</p> : null}
            {order.cancelledAt ? <p>Cancelled {new Date(order.cancelledAt).toLocaleString('en-IN')}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
