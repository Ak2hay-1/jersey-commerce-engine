'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
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
import { PromoCodeField } from '../cart/promo-code-field';
import { Alert } from '../ui/alert';
import { Input } from '../ui/input';
import { EmptyState } from '../ui/empty-state';
import { blockingCheckoutIssues } from '../../lib/checkout';
import { MOTION_DURATION, MOTION_EASE } from '../motion/presence';

const STEPS = ['Contact', 'Delivery', 'Payment', 'Confirmation'] as const;

export function CheckoutForm(): React.JSX.Element {
  const router = useRouter();
  const store = useStore();
  const razorpayEnabled = store.payments?.razorpay ?? false;
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
  const reduced = useReducedMotion();

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
    return <EmptyState title="Your cart is empty" description="Add a piece before checking out." actionHref="/products" actionLabel="Shop products" />;
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
          notes: razorpayEnabled ? 'ONLINE' : undefined,
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

  const sectionMotion = reduced
    ? undefined
    : {
        initial: { opacity: 0, y: 10 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.2 },
        transition: { duration: MOTION_DURATION, ease: MOTION_EASE },
      };

  return (
    <form onSubmit={placeOrder} className="mx-auto grid max-w-store gap-8 store-gutter py-8 md:py-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-8">
        <ol className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {STEPS.map((label, index) => {
            const active = index === step;
            return (
              <li key={label} className="relative pb-1">
                <span className={active ? 'text-foreground' : undefined}>
                  {index + 1}. {label}
                </span>
                {active ? (
                  <motion.span
                    layoutId="checkout-step-underline"
                    className="absolute inset-x-0 bottom-0 h-px bg-foreground"
                    transition={{ duration: MOTION_DURATION, ease: MOTION_EASE }}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {issues.map((issue) => (
          <Alert key={`${issue.code}-${issue.itemId ?? issue.message}`} tone={issue.code === 'PRICE_CHANGED' ? 'warning' : 'danger'}>
            {issue.message}
          </Alert>
        ))}
        <motion.section className="space-y-3" {...sectionMotion}>
          <h1 className="font-heading text-2xl uppercase tracking-wide md:text-3xl">Contact</h1>
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
        </motion.section>
        <motion.section className="space-y-3" {...sectionMotion}>
          <h2 className="font-heading text-2xl uppercase tracking-wide md:text-3xl">Promo code</h2>
          <PromoCodeField />
        </motion.section>
        <motion.section className="space-y-3" {...sectionMotion}>
          <h2 className="font-heading text-2xl uppercase tracking-wide md:text-3xl">Delivery</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              className="w-full cursor-pointer sm:w-auto"
              variant={method === 'DELIVERY' ? 'default' : 'outline'}
              onClick={() => {
                setMethod('DELIVERY');
                setStep(1);
              }}
            >
              Delivery
            </Button>
            <Button
              type="button"
              className="w-full cursor-pointer sm:w-auto"
              variant={method === 'STORE_PICKUP' ? 'default' : 'outline'}
              onClick={() => {
                setMethod('STORE_PICKUP');
                setStep(1);
              }}
            >
              Store pickup
            </Button>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            {method === 'DELIVERY' ? (
              <motion.div
                key="delivery-address"
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: MOTION_DURATION, ease: MOTION_EASE }}
              >
                <AddressForm value={address} onChange={setAddress} />
              </motion.div>
            ) : (
              <motion.p
                key="pickup-note"
                className="text-sm text-muted-foreground"
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: MOTION_DURATION, ease: MOTION_EASE }}
              >
                Collect from {store.website.contactAddress ?? store.tenant.name}.
              </motion.p>
            )}
          </AnimatePresence>
        </motion.section>
        <motion.section
          className="space-y-3"
          {...sectionMotion}
          onFocusCapture={() => setStep(2)}
        >
          <h2 className="font-heading text-2xl uppercase tracking-wide md:text-3xl">Payment</h2>
          <div className="border border-foreground bg-foreground px-4 py-4 text-background">
            <p className="text-sm font-semibold uppercase tracking-[0.16em]">
              {razorpayEnabled ? 'Pay with Razorpay' : 'Online payment'}
            </p>
            <p className="mt-2 text-sm text-background/75">
              {razorpayEnabled
                ? 'Pay securely with UPI, cards, or net banking. Your order is confirmed once payment succeeds.'
                : 'Online checkout is being set up. Contact the store if you need help placing an order.'}
            </p>
          </div>
        </motion.section>
        <Button
          type="submit"
          className="store-cta w-full cursor-pointer rounded-none md:w-auto"
          disabled={pending || blocking.length > 0 || !razorpayEnabled}
          onClick={() => setStep(3)}
        >
          {pending ? 'Placing order…' : razorpayEnabled ? 'Pay & place order' : 'Checkout unavailable'}
        </Button>
      </div>
      <CheckoutSummary cart={cart} quote={quote} currency={store.tenant.currency} />
    </form>
  );
}
