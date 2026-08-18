'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

const MESSAGES = ['Enjoy free shipping', 'Cash on delivery available', 'Secure and reliable checkout'];

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
    <div className="border-b border-foreground/10 bg-foreground text-background">
      <div className="mx-auto flex h-9 max-w-store items-center justify-center px-4 text-[10px] font-semibold uppercase tracking-[0.22em]">
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
