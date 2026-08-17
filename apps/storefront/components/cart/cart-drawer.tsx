'use client';

import Link from 'next/link';
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
  const { cart, open, setOpen, updateItem, removeItem, error } = useCart();
  const { tenant } = useStore();
  const currency = tenant.currency;
  const reduced = useReducedMotion();

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

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50" key="cart-drawer">
          <motion.button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close cart"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MOTION_TRANSITION}
          />
          <motion.aside
            className="absolute inset-y-2 right-0 flex w-full max-w-md flex-col rounded-l-[2rem] border border-border bg-background shadow-drawer md:inset-y-3 md:right-3 md:rounded-[2rem]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            initial={reduced ? { opacity: 0 } : { x: '100%' }}
            animate={reduced ? { opacity: 1 } : { x: 0 }}
            exit={reduced ? { opacity: 0 } : { x: '100%' }}
            transition={MOTION_TRANSITION}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-5">
              <h2 id="cart-title" className="font-heading text-xl font-extrabold uppercase tracking-[0.16em]">
                Cart
              </h2>
              <Button type="button" variant="ghost" size="icon" aria-label="Close cart" onClick={() => setOpen(false)}>
                <X />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
              {!cart || cart.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Your cart is empty.</p>
              ) : (
                <ul className="space-y-4">
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
              <div className="space-y-3 border-t border-border px-4 py-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatMoney(cart.totals.subtotal, currency)}</span>
                </div>
                <p className="text-xs text-muted-foreground">Shipping and tax are calculated at checkout.</p>
                <Button asChild className="store-pill h-11 w-full bg-foreground text-background hover:bg-foreground/90">
                  <Link href="/checkout" onClick={() => setOpen(false)}>
                    Checkout
                  </Link>
                </Button>
                <Button asChild variant="outline" className="store-pill h-11 w-full rounded-full">
                  <Link href="/cart" onClick={() => setOpen(false)}>
                    View cart
                  </Link>
                </Button>
              </div>
            ) : null}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
