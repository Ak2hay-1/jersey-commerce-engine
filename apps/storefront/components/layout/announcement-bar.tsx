'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

const MESSAGES = ['Free delivery on orders above ₹2,000', 'Secure checkout with Razorpay', 'Replica-inspired football jerseys'];

export function AnnouncementBar(): React.JSX.Element {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) {
      return;
    }
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % MESSAGES.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [reduced]);

  return (
    <div className="sticky top-0 z-50 border-b border-foreground/10 bg-foreground pt-[env(safe-area-inset-top)] text-background">
      <div className="mx-auto flex min-h-9 max-w-store items-center justify-center store-gutter py-2 text-center text-[10px] font-semibold uppercase leading-tight tracking-[0.18em] sm:h-9 sm:py-0 sm:tracking-[0.22em]">
        {reduced ? (
          <span>{MESSAGES[0]}</span>
        ) : (
          <AnimatePresence mode="wait">
            <motion.span
              key={MESSAGES[index]}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              {MESSAGES[index]}
            </motion.span>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
