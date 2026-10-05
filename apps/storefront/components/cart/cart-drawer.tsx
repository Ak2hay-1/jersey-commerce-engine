'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ShoppingBag, X } from 'lucide-react';
import { formatMoney } from '../../lib/format';
import { useCart } from '../providers/cart-provider';
import { useStore } from '../providers/store-provider';
import { CartItemRow } from './cart-item';
import { FreeDeliveryProgress } from './free-delivery-progress';
import { MOTION_DRAWER, MOTION_DURATION, MOTION_EASE, MOTION_TRANSITION } from '../motion/presence';

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
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen]);

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
            className="absolute inset-0 cursor-pointer bg-black/60 backdrop-blur-[2px]"
            aria-label="Close cart"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MOTION_TRANSITION}
          />
          <motion.aside
            className="absolute inset-y-0 right-0 z-10 flex w-full max-w-md flex-col border-l border-white/10 bg-[hsl(var(--surface-1))] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] shadow-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            data-cursor="hover"
            initial={reduced ? { opacity: 0 } : { x: '100%' }}
            animate={reduced ? { opacity: 1 } : { x: 0 }}
            exit={reduced ? { opacity: 0 } : { x: '100%' }}
            transition={reduced ? MOTION_TRANSITION : MOTION_DRAWER}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 id="cart-title" className="flex items-baseline gap-2 font-heading text-2xl uppercase tracking-wide">
                Your cart
                {cart?.itemCount ? <span className="tabular text-sm font-semibold text-muted-foreground">({cart.itemCount})</span> : null}
              </h2>
              <button type="button" className="icon-btn cursor-pointer border-transparent" aria-label="Close cart" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {!empty ? (
              <div className="border-b border-white/10 px-5 py-4">
                <FreeDeliveryProgress subtotal={cart.totals.subtotal} currency={currency} />
              </div>
            ) : null}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {error ? <p className="mb-3 text-sm text-red-300">{error}</p> : null}
              {empty ? (
                <motion.div
                  className="flex h-full flex-col items-center justify-center gap-4 text-center"
                  initial={reduced ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: MOTION_DURATION, ease: MOTION_EASE, delay: 0.05 }}
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-[hsl(var(--surface-2))] text-muted-foreground">
                    <ShoppingBag className="h-7 w-7" />
                  </span>
                  <p className="font-display text-3xl">Your cart is empty</p>
                  <p className="max-w-xs text-sm text-muted-foreground">The latest drops are waiting. Find your kit and come back.</p>
                  <button type="button" className="btn btn-lg btn-primary mt-2 cursor-pointer" onClick={() => navigate('/products')}>
                    Continue shopping
                  </button>
                </motion.div>
              ) : (
                <ul className="divide-y divide-white/[0.08]">
                  <AnimatePresence initial={false}>
                    {cart.items.map((item, index) => (
                      <motion.li
                        key={item.id}
                        className="py-5 first:pt-0 last:pb-0"
                        layout={!reduced}
                        initial={reduced ? false : { opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={reduced ? { opacity: 0 } : { opacity: 0, x: 12 }}
                        transition={{
                          duration: MOTION_DURATION,
                          ease: MOTION_EASE,
                          delay: reduced ? 0 : Math.min(index, 6) * 0.04,
                        }}
                      >
                        <CartItemRow
                          item={item}
                          currency={currency}
                          onQuantity={(quantity) => void updateItem(item.id, quantity)}
                          onRemove={() => void removeItem(item.id)}
                        />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>
            {cart && cart.items.length > 0 ? (
              <motion.div
                className="relative z-20 space-y-3 border-t border-white/10 bg-[hsl(var(--surface-2))] px-5 py-5"
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: MOTION_DURATION, ease: MOTION_EASE, delay: 0.12 }}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="tabular font-heading text-2xl font-bold">{formatMoney(cart.totals.subtotal, currency)}</span>
                </div>
                <p className="text-xs text-muted-foreground">Shipping and promo codes are applied at checkout.</p>
                <button type="button" className="btn btn-lg btn-primary w-full cursor-pointer" data-cursor="hover" onClick={() => navigate('/checkout')}>
                  Checkout
                </button>
                <button type="button" className="btn btn-secondary w-full cursor-pointer" data-cursor="hover" onClick={() => navigate('/cart')}>
                  View cart
                </button>
              </motion.div>
            ) : null}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
