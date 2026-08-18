import type { CartDto, CheckoutQuote } from '@jersey-commerce/types';
import { formatMoney } from '../../lib/format';

export function CheckoutSummary({
  cart,
  quote,
  currency,
}: {
  cart: CartDto;
  quote?: CheckoutQuote | null;
  currency: string;
}): React.JSX.Element {
  const totals = quote?.totals ?? cart.totals;
  return (
    <aside className="border border-border p-4">
      <h2 className="font-heading text-xl uppercase tracking-wide">Order summary</h2>
      <ul className="mt-4 space-y-3 text-sm">
        {cart.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-3">
            <span>
              {item.productName} × {item.quantity}
            </span>
            <span>{formatMoney(item.lineTotal, currency)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{formatMoney(totals.subtotal, currency)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Shipping</dt>
          <dd>{formatMoney(totals.shippingAmount, currency)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Tax</dt>
          <dd>{formatMoney(totals.tax, currency)}</dd>
        </div>
        <div className="flex justify-between font-heading text-lg uppercase">
          <dt>Total</dt>
          <dd>{formatMoney(totals.total, currency)}</dd>
        </div>
        <p className="text-xs text-muted-foreground">Cash on delivery. Pay when it arrives.</p>
      </dl>
    </aside>
  );
}
