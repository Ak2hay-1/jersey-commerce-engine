'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { DEFAULT_STOREFRONT_CHROME } from '@jersey-commerce/types';
import { useStore } from '../providers/store-provider';

export function AnnouncementBar(): React.JSX.Element {
  const store = useStore();
  const messages =
    store.website.chrome?.announcementMessages?.filter(Boolean).length
      ? store.website.chrome.announcementMessages.filter(Boolean)
      : DEFAULT_STOREFRONT_CHROME.announcementMessages;
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [messages.join('|')]);

  useEffect(() => {
    if (reduced || messages.length <= 1) {
      return;
    }
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % messages.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [messages.length, reduced]);

  const text = messages[Math.min(index, messages.length - 1)] ?? '';

  return (
    <div className="sticky top-0 z-50 border-b border-foreground/10 bg-foreground pt-[env(safe-area-inset-top)] text-background">
      <div className="mx-auto flex min-h-9 max-w-store items-center justify-center store-gutter py-2 text-center text-[10px] font-semibold uppercase leading-tight tracking-[0.18em] sm:h-9 sm:py-0 sm:tracking-[0.22em]">
        {reduced || messages.length <= 1 ? (
          <span>{text}</span>
        ) : (
          <AnimatePresence mode="wait">
            <motion.span
              key={text}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              {text}
            </motion.span>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
