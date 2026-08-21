'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Button } from '@jersey-commerce/ui';
import { X } from 'lucide-react';
import { formatMoney } from '../../lib/format';
import { useCart } from '../providers/cart-provider';
import { useStore } from '../providers/store-provider';
import { CartItemRow } from './cart-item';
import { MOTION_TRANSITION } from '../motion/presence';

export function CartDrawer(): React.JSX.Element {
  const router = useRouter();
  const { cart, open, setOpen, updateItem, removeItem, error } = useCart();
  const { tenant } = useStore();
  const currency = tenant.currency;
  const reduced = useReducedMotion();
  const empty = !cart || cart.items.length === 0;

  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[110]" key="cart-drawer">
          <motion.button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close cart"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MOTION_TRANSITION}
          />
          <motion.aside
            className="absolute inset-y-0 right-0 z-10 flex w-full max-w-md flex-col border-l border-border bg-background shadow-drawer pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            initial={reduced ? { opacity: 0 } : { x: '100%' }}
            animate={reduced ? { opacity: 1 } : { x: 0 }}
            exit={reduced ? { opacity: 0 } : { x: '100%' }}
            transition={MOTION_TRANSITION}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-5">
              <h2 id="cart-title" className="font-heading text-2xl uppercase tracking-[0.12em]">
                Cart
              </h2>
              <Button type="button" variant="ghost" size="icon" className="rounded-none" aria-label="Close cart" onClick={() => setOpen(false)}>
                <X />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
              {empty ? (
                <div className="space-y-4">
                  <p className="font-heading text-2xl uppercase">Your cart is empty</p>
                  <p className="text-sm text-muted-foreground">You might also like the latest drop.</p>
                  <Button type="button" className="store-pill rounded-none bg-foreground text-background" onClick={() => navigate('/products')}>
                    Continue shopping
                  </Button>
                </div>
              ) : (
                <ul className="space-y-5">
                  {cart.items.map((item) => (
                    <li key={item.id}>
                      <CartItemRow
                        item={item}
                        currency={currency}
                        onQuantity={(quantity) => void updateItem(item.id, quantity)}
                        onRemove={() => void removeItem(item.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {cart && cart.items.length > 0 ? (
              <div className="relative z-20 space-y-3 border-t border-border bg-background px-5 py-5">
                <div className="flex justify-between text-sm uppercase tracking-[0.12em]">
                  <span>Subtotal</span>
                  <span>{formatMoney(cart.totals.subtotal, currency)}</span>
                </div>
                <p className="text-xs text-muted-foreground">Cash on delivery at checkout. Shipping calculated next.</p>
                <Button
                  type="button"
                  className="store-pill h-12 w-full rounded-none bg-foreground text-background hover:bg-foreground/90"
                  onClick={() => navigate('/checkout')}
                >
                  Checkout · COD
                </Button>
                <Button type="button" variant="outline" className="store-pill h-11 w-full rounded-none" onClick={() => navigate('/cart')}>
                  View cart
                </Button>
              </div>
            ) : null}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
