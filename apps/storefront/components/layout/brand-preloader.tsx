'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useStore } from '../providers/store-provider';

const STORAGE_KEY = 'jerzyfy-preloader-seen';

export function BrandPreloader(): React.JSX.Element | null {
  const store = useStore();
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reduced) {
      return;
    }
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) {
        return;
      }
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Ignore storage failures and still show once this session.
    }
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 1600);
    return () => window.clearTimeout(timer);
  }, [reduced]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.p
            className="font-heading text-5xl uppercase tracking-[0.18em] md:text-7xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {store.tenant.name}
          </motion.p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
