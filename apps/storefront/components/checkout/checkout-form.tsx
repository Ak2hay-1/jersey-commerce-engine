'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { Banknote, Check, CreditCard, Lock, Store, Truck } from 'lucide-react';
import { cn } from '@jersey-commerce/ui';
import type { CheckoutQuote, FulfillmentMethod, ShippingQuoteResult } from '@jersey-commerce/types';
import { storeApi } from '../../lib/api';
import { persistSessionTokens } from '../../lib/cookies';
import { publicErrorMessage, StoreApiError } from '../../lib/errors';
import { formatMoney } from '../../lib/format';
import { payWithRazorpay, PaymentDismissedError } from '../../lib/razorpay-pay';
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
import { ConsentNotice } from '../legal/consent-notice';

const STEPS = ['Contact', 'Delivery', 'Payment', 'Confirmation'] as const;

const CHECKOUT_KEY_PREFIX = 'jce_checkout_key_';

function newCheckoutKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `chk_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/** Survives reloads so a retried submit replays the same order instead of reserving stock twice. */
function checkoutKeyForCart(cartId: string | undefined): string {
  if (typeof window === 'undefined' || !cartId) {
    return newCheckoutKey();
  }
  const storageKey = `${CHECKOUT_KEY_PREFIX}${cartId}`;
  try {
    const existing = window.sessionStorage.getItem(storageKey);
    if (existing) {
      return existing;
    }
    const created = newCheckoutKey();
    window.sessionStorage.setItem(storageKey, created);
    return created;
  } catch {
    return newCheckoutKey();
  }
}

function clearCheckoutKey(cartId: string | undefined): void {
  if (typeof window === 'undefined' || !cartId) {
    return;
  }
  try {
    window.sessionStorage.removeItem(`${CHECKOUT_KEY_PREFIX}${cartId}`);
  } catch {
    // ignore
  }
}

function PanelTitle({ index, children, as: Heading = 'h2' }: { index: number; children: ReactNode; as?: 'h1' | 'h2' }): React.JSX.Element {
  return (
    <Heading className="flex items-center gap-3 font-heading text-2xl uppercase tracking-wide">
      <span className="tabular flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--accent))] font-sans text-xs font-bold text-white">
        {index}
      </span>
      {children}
    </Heading>
  );
}

function OptionCard({
  selected,
  icon,
  title,
  description,
  onSelect,
}: {
  selected: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  onSelect: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-[var(--radius)] border px-4 py-3 text-left transition-colors',
        selected ? 'border-foreground bg-white/[0.06]' : 'border-white/15 hover:border-white/40',
      )}
    >
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', selected ? 'bg-foreground text-background' : 'bg-white/[0.06] text-foreground/80')}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
      <span
        className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border', selected ? 'border-foreground bg-foreground text-background' : 'border-white/25')}
        aria-hidden
      >
        {selected ? <Check className="h-3 w-3" /> : null}
      </span>
    </button>
  );
}

export function CheckoutForm(): React.JSX.Element {
  const router = useRouter();
  const store = useStore();
  const razorpayEnabled = store.payments?.razorpay ?? false;
  const codEnabled = store.payments?.cod ?? false;
  const razorpayKeyId = store.payments?.razorpayKeyId ?? null;
  const { cart, refresh } = useCart();
  const { customer } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(customer?.name ?? '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [method, setMethod] = useState<FulfillmentMethod>('DELIVERY');
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'COD'>(razorpayEnabled ? 'ONLINE' : 'COD');
  const [shippingMode, setShippingMode] = useState<'EXPRESS' | 'SURFACE'>('SURFACE');
  const [address, setAddress] = useState(emptyAddress());
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [shippingQuote, setShippingQuote] = useState<ShippingQuoteResult | null>(null);
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

  useEffect(() => {
    if (method !== 'DELIVERY' || address.postalCode.trim().length < 6) {
      setShippingQuote(null);
      return;
    }
    const handle = window.setTimeout(() => {
      void storeApi
        .shippingQuote({
          postalCode: address.postalCode.trim(),
          mode: shippingMode,
          cod: paymentMethod === 'COD',
        })
        .then(setShippingQuote)
        .catch(() => setShippingQuote(null));
    }, 400);
    return () => window.clearTimeout(handle);
  }, [method, address.postalCode, shippingMode, paymentMethod]);

  const issues = quote?.issues ?? [];
  const blocking = blockingCheckoutIssues(issues);
  const canPayOnline = razorpayEnabled;
  const canPayCod = codEnabled && method === 'DELIVERY';
  const checkoutAvailable = canPayOnline || canPayCod;

  if (!cart || cart.items.length === 0) {
    return <EmptyState title="Your cart is empty" description="Add a piece before checking out." actionHref="/products" actionLabel="Shop products" />;
  }

  const cartId = cart.id;

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
      if (paymentMethod === 'ONLINE' && !canPayOnline) {
        setError('Online payment is not available.');
        return;
      }
      if (paymentMethod === 'COD' && !canPayCod) {
        setError('Cash on delivery is not available.');
        return;
      }
      if (shippingQuote && method === 'DELIVERY' && !shippingQuote.serviceability.serviceable) {
        setError(shippingQuote.serviceability.message ?? 'Delivery is not available for this pincode.');
        return;
      }

      const result = await storeApi.checkout(
        {
          fulfillmentMethod: method,
          paymentMethod,
          shippingMode: method === 'DELIVERY' ? shippingMode : undefined,
          customer: { name, email: email || undefined, phone: phone || undefined },
          shippingAddress: method === 'DELIVERY' ? toShippingDto(address) : undefined,
          notes: paymentMethod === 'ONLINE' ? 'ONLINE' : 'COD',
        },
        { idempotencyKey: checkoutKeyForCart(cartId) },
      );
      if (result.customerAccessToken || result.orderAccessToken) {
        await persistSessionTokens({
          customerToken: result.customerAccessToken,
          orderAccessToken: result.orderAccessToken,
        });
      }

      if (paymentMethod === 'COD') {
        clearCheckoutKey(cartId);
        await refresh();
        router.push(`/order/success/${result.order.orderNumber}`);
        return;
      }

      const intent = result.order.paymentIntent;
      const orderId = intent?.razorpayOrderId;
      const keyId = intent?.razorpayKeyId || razorpayKeyId;
      const amountPaise = intent?.amountPaise;

      if (!orderId || !keyId || !amountPaise) {
        setError('Online payment could not be started. Please try again or contact the store.');
        return;
      }

      try {
        await payWithRazorpay({
          keyId,
          razorpayOrderId: orderId,
          amountPaise,
          currency: result.order.currency || 'INR',
          storeName: store.tenant.name,
          orderNumber: result.order.orderNumber,
          themeColor: store.theme.primaryColor,
          prefill: {
            name: name || undefined,
            email: email || undefined,
            contact: phone || undefined,
          },
        });
      } catch (paymentError) {
        // The order exists and holds stock; the order page offers "Complete payment" instead of a dead end.
        if (!(paymentError instanceof PaymentDismissedError)) {
          setError(publicErrorMessage(paymentError, 'Payment could not be completed.'));
        }
      }
      clearCheckoutKey(cartId);
      await refresh();
      router.push(`/order/success/${result.order.orderNumber}`);
    } catch (caught) {
      if (caught instanceof StoreApiError && caught.status === 409) {
        clearCheckoutKey(cartId);
      }
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

  const submitLabel =
    paymentMethod === 'COD'
      ? pending
        ? 'Placing order…'
        : 'Place COD order'
      : pending
        ? 'Processing payment…'
        : 'Pay & place order';

  return (
    <form onSubmit={placeOrder} className="mx-auto max-w-store store-gutter pb-[var(--space-section)] pt-8 md:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-[clamp(2.5rem,6vw,4rem)]">Checkout</h1>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          Secure checkout
        </p>
      </div>
      <ol className="mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:gap-3">
        {STEPS.map((label, index) => {
          const active = index === step;
          const done = index < step;
          return (
            <li key={label} className="flex items-center gap-2 sm:gap-3">
              {index > 0 ? <span className="h-px w-4 bg-white/15 sm:w-8" aria-hidden /> : null}
              <span className={cn('flex items-center gap-2', (active || done) && 'text-foreground')}>
                <span
                  className={cn(
                    'relative flex h-6 w-6 items-center justify-center rounded-full border text-[11px]',
                    active ? 'border-foreground' : done ? 'border-transparent bg-foreground text-background' : 'border-white/20',
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : index + 1}
                  {active ? (
                    <motion.span
                      layoutId="checkout-step-ring"
                      className="absolute -inset-1 rounded-full border border-[hsl(var(--accent))]"
                      transition={{ duration: MOTION_DURATION, ease: MOTION_EASE }}
                    />
                  ) : null}
                </span>
                <span className={active ? undefined : 'hidden sm:inline'}>{label}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12">
      <div className="order-2 space-y-5 lg:order-1">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {issues.map((issue) => (
          <Alert key={`${issue.code}-${issue.itemId ?? issue.message}`} tone={issue.code === 'PRICE_CHANGED' ? 'warning' : 'danger'}>
            {issue.message}
          </Alert>
        ))}
        <motion.section className="panel space-y-4 p-5 sm:p-7" {...sectionMotion}>
          <PanelTitle index={1}>Contact</PanelTitle>
          <label className="grid gap-1.5 text-sm text-muted-foreground">
            Name
            <Input value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" onFocus={() => setStep(0)} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm text-muted-foreground">
              Email
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
            </label>
            <label className="grid gap-1.5 text-sm text-muted-foreground">
              Phone
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required />
            </label>
          </div>
        </motion.section>
        <motion.section className="panel space-y-4 p-5 sm:p-7" {...sectionMotion}>
          <PanelTitle index={2}>Delivery</PanelTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <OptionCard
              selected={method === 'DELIVERY'}
              icon={<Truck className="h-5 w-5" />}
              title="Home delivery"
              description="Shipped to your door"
              onSelect={() => {
                setMethod('DELIVERY');
                setStep(1);
              }}
            />
            <OptionCard
              selected={method === 'STORE_PICKUP'}
              icon={<Store className="h-5 w-5" />}
              title="Store pickup"
              description="Collect in person"
              onSelect={() => {
                setMethod('STORE_PICKUP');
                if (paymentMethod === 'COD') {
                  setPaymentMethod('ONLINE');
                }
                setStep(1);
              }}
            />
          </div>
          <AnimatePresence mode="wait" initial={false}>
            {method === 'DELIVERY' ? (
              <motion.div
                key="delivery-address"
                className="space-y-3"
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: MOTION_DURATION, ease: MOTION_EASE }}
              >
                <AddressForm value={address} onChange={setAddress} />
                {shippingQuote ? (
                  <div className="space-y-3 rounded-[var(--radius)] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
                    <p className={shippingQuote.serviceability.serviceable ? 'text-emerald-300' : 'text-red-300'}>
                      {shippingQuote.serviceability.serviceable
                        ? 'Pincode is serviceable'
                        : shippingQuote.serviceability.message ?? 'Pincode not serviceable'}
                    </p>
                    {shippingQuote.rates.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {shippingQuote.rates.map((rate) => (
                          <button
                            key={rate.mode}
                            type="button"
                            className="chip cursor-pointer"
                            aria-pressed={shippingMode === rate.mode}
                            onClick={() => setShippingMode(rate.mode)}
                          >
                            {rate.mode} · {formatMoney(rate.amount, store.tenant.currency)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {shippingQuote.serviceability.codAvailable === false && paymentMethod === 'COD' ? (
                      <p className="text-muted-foreground">COD is not available for this pincode.</p>
                    ) : null}
                  </div>
                ) : null}
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
          className="panel space-y-4 p-5 sm:p-7"
          {...sectionMotion}
          onFocusCapture={() => setStep(2)}
        >
          <PanelTitle index={3}>Payment</PanelTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {canPayOnline ? (
              <OptionCard
                selected={paymentMethod === 'ONLINE'}
                icon={<CreditCard className="h-5 w-5" />}
                title="Pay online"
                description="UPI, cards, net banking"
                onSelect={() => setPaymentMethod('ONLINE')}
              />
            ) : null}
            {canPayCod ? (
              <OptionCard
                selected={paymentMethod === 'COD'}
                icon={<Banknote className="h-5 w-5" />}
                title="Cash on delivery"
                description="Pay when it arrives"
                onSelect={() => setPaymentMethod('COD')}
              />
            ) : null}
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {paymentMethod === 'COD'
              ? 'Pay the courier when your order arrives. COD is collected by Delhivery.'
              : razorpayEnabled
                ? 'Pay securely with UPI, cards, or net banking via Razorpay. Your order is confirmed once payment succeeds.'
                : 'Online checkout is being set up. Contact the store if you need help placing an order.'}
          </p>
          <button
            type="submit"
            className="btn btn-lg btn-primary w-full cursor-pointer"
            disabled={pending || blocking.length > 0 || !checkoutAvailable}
            onClick={() => setStep(3)}
          >
            <Lock className="h-4 w-4" aria-hidden />
            {checkoutAvailable ? submitLabel : 'Checkout unavailable'}
          </button>
          <ConsentNotice action="placing your order" />
        </motion.section>
      </div>
      <div className="order-1 lg:order-2">
        <div className="space-y-5 lg:sticky lg:top-24">
          <CheckoutSummary cart={cart} quote={quote} currency={store.tenant.currency} shippingQuote={shippingQuote} />
          <div className="panel p-5">
            <p className="text-micro mb-3 text-muted-foreground">Promo code</p>
            <PromoCodeField />
          </div>
        </div>
      </div>
      </div>
    </form>
  );
}
