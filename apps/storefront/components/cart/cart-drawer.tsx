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
            className="absolute inset-0 cursor-pointer bg-black/45"
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
            data-cursor="hover"
            initial={reduced ? { opacity: 0 } : { x: '100%' }}
            animate={reduced ? { opacity: 1 } : { x: 0 }}
            exit={reduced ? { opacity: 0 } : { x: '100%' }}
            transition={reduced ? MOTION_TRANSITION : MOTION_DRAWER}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-5">
              <h2 id="cart-title" className="font-heading text-2xl uppercase tracking-[0.12em]">
                Cart
              </h2>
              <Button type="button" variant="ghost" size="icon" className="cursor-pointer rounded-none" aria-label="Close cart" onClick={() => setOpen(false)}>
                <X />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
              {empty ? (
                <motion.div
                  className="space-y-4"
                  initial={reduced ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: MOTION_DURATION, ease: MOTION_EASE, delay: 0.05 }}
                >
                  <p className="font-heading text-2xl uppercase">Your cart is empty</p>
                  <p className="text-sm text-muted-foreground">You might also like the latest drop.</p>
                  <Button type="button" className="store-pill cursor-pointer rounded-none bg-foreground text-background" onClick={() => navigate('/products')}>
                    Continue shopping
                  </Button>
                </motion.div>
              ) : (
                <ul className="space-y-5">
                  <AnimatePresence initial={false}>
                    {cart.items.map((item, index) => (
                      <motion.li
                        key={item.id}
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
                className="relative z-20 space-y-3 border-t border-border bg-background px-5 py-5"
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: MOTION_DURATION, ease: MOTION_EASE, delay: 0.12 }}
              >
                <div className="flex justify-between text-sm uppercase tracking-[0.12em]">
                  <span>Subtotal</span>
                  <span>{formatMoney(cart.totals.subtotal, currency)}</span>
                </div>
                <p className="text-xs text-muted-foreground">Free delivery on orders above ₹2,000. Shipping calculated at checkout.</p>
                <Button
                  type="button"
                  className="store-pill h-12 w-full cursor-pointer rounded-none bg-foreground text-background hover:bg-foreground/90"
                  data-cursor="hover"
                  onClick={() => navigate('/checkout')}
                >
                  Checkout
                </Button>
                <Button type="button" variant="outline" className="store-pill h-11 w-full cursor-pointer rounded-none" data-cursor="hover" onClick={() => navigate('/cart')}>
                  View cart
                </Button>
              </motion.div>
            ) : null}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
