import type { CartDto, CheckoutQuote, ShippingQuoteResult } from '@jersey-commerce/types';
import { formatMoney } from '../../lib/format';

export function CheckoutSummary({
  cart,
  quote,
  currency,
  shippingQuote,
}: {
  cart: CartDto;
  quote?: CheckoutQuote | null;
  currency: string;
  shippingQuote?: ShippingQuoteResult | null;
}): React.JSX.Element {
  const totals = quote?.totals ?? cart.totals;
  const shippingAmount =
    shippingQuote?.calculationMode === 'DELHIVERY' && shippingQuote.shippingAmount
      ? shippingQuote.shippingAmount
      : totals.shippingAmount;
  const merchandise = Number(totals.total) - Number(totals.shippingAmount);
  const displayTotal =
    shippingQuote?.calculationMode === 'DELHIVERY'
      ? (merchandise + Number(shippingAmount)).toFixed(2)
      : totals.total;

  return (
    <aside className="border border-border p-4">
      <h2 className="font-heading text-xl uppercase tracking-wide">Order summary</h2>
      <ul className="mt-4 space-y-3 text-sm">
        {cart.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-3">
            <span className="min-w-0 break-words">
              {item.productName} × {item.quantity}
            </span>
            <span className="shrink-0">{formatMoney(item.lineTotal, currency)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{formatMoney(totals.subtotal, currency)}</dd>
        </div>
        {Number(totals.discount) > 0 ? (
          <div className="flex justify-between">
            <dt>Discount{cart.promoCode ? ` (${cart.promoCode.code})` : ''}</dt>
            <dd>−{formatMoney(totals.discount, currency)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt>Shipping{shippingQuote?.selectedMode ? ` (${shippingQuote.selectedMode})` : ''}</dt>
          <dd>{Number(shippingAmount) > 0 ? formatMoney(shippingAmount, currency) : 'Free'}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Tax</dt>
          <dd>{formatMoney(totals.tax, currency)}</dd>
        </div>
        <div className="flex justify-between font-heading text-lg uppercase">
          <dt>Total</dt>
          <dd>{formatMoney(displayTotal, currency)}</dd>
        </div>
      </dl>
    </aside>
  );
}
