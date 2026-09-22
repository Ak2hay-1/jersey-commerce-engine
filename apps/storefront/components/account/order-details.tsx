import type { OrderDetail, OrderShipmentDto } from '@jersey-commerce/types';
import { formatMoney } from '../../lib/format';
import { OrderStatus, nextStepCopy } from './order-status';

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

function ShipmentBlock({
  shipment,
}: {
  shipment: OrderShipmentDto | null | undefined;
}): React.JSX.Element | null {
  if (!shipment) {
    return null;
  }
  return (
    <section className="space-y-2 border-t pt-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Shipment</h2>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
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
        <a
          href={shipment.trackingUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-sm font-medium underline underline-offset-4"
        >
          Track on Delhivery
        </a>
      ) : null}
    </section>
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
      <p className="text-sm text-muted-foreground">{nextStepCopy(order)}</p>
      <p className="text-sm">
        Status: {label(order.status)} · Payment: {label(order.paymentState)} ·{' '}
        {order.fulfillmentMethod === 'STORE_PICKUP' ? 'Store pickup' : 'Delivery'}
      </p>
      <OrderStatus order={order} />

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Items</h2>
        <ul className="divide-y border-y">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 py-3 text-sm">
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
              <span className="shrink-0 font-medium">{money(item.total, currency)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-1 text-sm">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Totals</h2>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{money(order.subtotal, currency)}</span>
        </div>
        {Number(order.discount) > 0 ? (
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Discount</span>
            <span>−{money(order.discount, currency)}</span>
          </div>
        ) : null}
        {Number(order.tax) > 0 ? (
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Tax</span>
            <span>{money(order.tax, currency)}</span>
          </div>
        ) : null}
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Shipping</span>
          <span>{Number(order.shippingAmount) > 0 ? money(order.shippingAmount, currency) : 'Free'}</span>
        </div>
        <p className="pt-2 font-heading text-2xl uppercase">Total {money(order.total, currency)}</p>
      </section>

      {order.customer ? (
        <section className="space-y-1 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Customer</h2>
          <p className="font-medium">{order.customer.name}</p>
          {order.customer.phone ? <p className="text-muted-foreground">{order.customer.phone}</p> : null}
          {order.customer.email ? <p className="text-muted-foreground">{order.customer.email}</p> : null}
        </section>
      ) : null}

      <section className="space-y-1 text-sm">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {order.fulfillmentMethod === 'STORE_PICKUP' ? 'Fulfillment' : 'Shipping address'}
        </h2>
        {order.fulfillmentMethod === 'STORE_PICKUP' ? (
          <p>Store pickup</p>
        ) : address ? (
          <div className="text-muted-foreground">
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
          <p className="text-muted-foreground">No address on file</p>
        )}
      </section>

      {order.payments.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Payments</h2>
          <ul className="divide-y border-y text-sm">
            {order.payments.map((payment) => (
              <li key={payment.id} className="flex justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">
                    {label(payment.method)} · {label(payment.status)}
                  </p>
                  {payment.reference ? <p className="text-muted-foreground">Ref {payment.reference}</p> : null}
                  {payment.provider ? <p className="text-muted-foreground">{payment.provider}</p> : null}
                </div>
                <span className="shrink-0">{money(payment.amount, currency)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ShipmentBlock shipment={order.shipment} />

      {(order.notes || order.cancelReason) && (
        <section className="space-y-1 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Notes</h2>
          {order.notes ? <p>{order.notes}</p> : null}
          {order.cancelReason ? <p className="text-muted-foreground">Cancel reason: {order.cancelReason}</p> : null}
        </section>
      )}

      <section className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <p>Placed {new Date(order.createdAt).toLocaleString('en-IN')}</p>
        {order.confirmedAt ? <p>Confirmed {new Date(order.confirmedAt).toLocaleString('en-IN')}</p> : null}
        {order.shippedAt ? <p>Shipped {new Date(order.shippedAt).toLocaleString('en-IN')}</p> : null}
        {order.completedAt ? <p>Completed {new Date(order.completedAt).toLocaleString('en-IN')}</p> : null}
        {order.cancelledAt ? <p>Cancelled {new Date(order.cancelledAt).toLocaleString('en-IN')}</p> : null}
      </section>
    </div>
  );
}
