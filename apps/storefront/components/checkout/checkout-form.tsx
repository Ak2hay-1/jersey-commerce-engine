'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@jersey-commerce/ui';
import type { CheckoutQuote, FulfillmentMethod } from '@jersey-commerce/types';
import { storeApi } from '../../lib/api';
import { STORE_COOKIES, writeBrowserCookie } from '../../lib/cookies';
import { publicErrorMessage } from '../../lib/errors';
import { useCart } from '../providers/cart-provider';
import { useAuth } from '../providers/auth-provider';
import { useStore } from '../providers/store-provider';
import { AddressForm, emptyAddress, toShippingDto } from './address-form';
import { CheckoutSummary } from './checkout-summary';
import { Alert } from '../ui/alert';
import { Input } from '../ui/input';
import { EmptyState } from '../ui/empty-state';
import { blockingCheckoutIssues } from '../../lib/checkout';

const STEPS = ['Contact', 'Delivery', 'Payment', 'Confirmation'] as const;

export function CheckoutForm(): React.JSX.Element {
  const router = useRouter();
  const store = useStore();
  const { cart, refresh } = useCart();
  const { customer } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(customer?.name ?? '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [method, setMethod] = useState<FulfillmentMethod>('DELIVERY');
  const [address, setAddress] = useState(emptyAddress());
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (customer) {
      setName((current) => current || customer.name);
      setEmail((current) => current || customer.email || '');
      setPhone((current) => current || customer.phone || '');
    }
  }, [customer]);

  useEffect(() => {
    if (!cart || cart.items.length === 0) {
      return;
    }
    void storeApi.quoteCheckout(method).then(setQuote).catch(() => setQuote(null));
  }, [cart, method]);

  const issues = quote?.issues ?? [];
  const blocking = blockingCheckoutIssues(issues);

  const idempotencyKey = useMemo(() => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `chk_${Date.now()}`;
  }, []);

  if (!cart || cart.items.length === 0) {
    return <EmptyState title="Your cart is empty" description="Add a jersey before checking out." actionHref="/products" actionLabel="Shop products" />;
  }

  async function placeOrder(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const latest = await storeApi.quoteCheckout(method);
      setQuote(latest);
      if (!latest.canCheckout) {
        setError(latest.issues[0]?.message ?? 'Checkout is not available for this cart.');
        return;
      }
      const result = await storeApi.checkout(
        {
          fulfillmentMethod: method,
          customer: { name, email: email || undefined, phone: phone || undefined },
          shippingAddress: method === 'DELIVERY' ? toShippingDto(address) : undefined,
        },
        { idempotencyKey },
      );
      if (result.customerAccessToken) {
        writeBrowserCookie(STORE_COOKIES.customer, result.customerAccessToken, 30 * 24 * 60 * 60);
      }
      await refresh();
      router.push(`/order/success/${result.order.orderNumber}`);
    } catch (caught) {
      setError(publicErrorMessage(caught, 'Checkout could not be completed.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={placeOrder} className="mx-auto grid max-w-store gap-8 px-4 py-10 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-8">
        <ol className="flex gap-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {STEPS.map((label, index) => (
            <li key={label} className={index === step ? 'text-foreground' : undefined}>
              {index + 1}. {label}
            </li>
          ))}
        </ol>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {issues.map((issue) => (
          <Alert key={`${issue.code}-${issue.itemId ?? issue.message}`} tone={issue.code === 'PRICE_CHANGED' ? 'warning' : 'danger'}>
            {issue.message}
          </Alert>
        ))}
        <section className="space-y-3">
          <h1 className="font-heading text-3xl uppercase tracking-wide">Contact</h1>
          <label className="grid gap-1 text-sm">
            Name
            <Input value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" onFocus={() => setStep(0)} />
          </label>
          <label className="grid gap-1 text-sm">
            Email
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
          </label>
          <label className="grid gap-1 text-sm">
            Phone
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required />
          </label>
        </section>
        <section className="space-y-3">
          <h2 className="font-heading text-3xl uppercase tracking-wide">Delivery</h2>
          <div className="flex gap-3">
            <Button type="button" variant={method === 'DELIVERY' ? 'default' : 'outline'} onClick={() => { setMethod('DELIVERY'); setStep(1); }}>
              Delivery
            </Button>
            <Button type="button" variant={method === 'STORE_PICKUP' ? 'default' : 'outline'} onClick={() => { setMethod('STORE_PICKUP'); setStep(1); }}>
              Store pickup
            </Button>
          </div>
          {method === 'DELIVERY' ? <AddressForm value={address} onChange={setAddress} /> : (
            <p className="text-sm text-muted-foreground">Collect from {store.website.contactAddress ?? store.tenant.name}.</p>
          )}
        </section>
        <section className="space-y-3">
          <h2 className="font-heading text-3xl uppercase tracking-wide">Payment</h2>
          <p className="text-sm text-muted-foreground">
            Online payment is prepared by the store. This checkout creates a pending payment intent; the store confirms payment before fulfillment.
          </p>
        </section>
        <Button type="submit" className="w-full md:w-auto" disabled={pending || blocking.length > 0} onClick={() => setStep(3)}>
          {pending ? 'Placing order…' : 'Place order'}
        </Button>
      </div>
      <CheckoutSummary cart={cart} quote={quote} currency={store.tenant.currency} />
    </form>
  );
}
