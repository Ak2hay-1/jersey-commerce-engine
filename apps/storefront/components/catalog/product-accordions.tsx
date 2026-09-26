'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { MOTION_DURATION, MOTION_EASE } from '../motion/presence';

const ITEMS = [
  {
    title: 'Care instructions',
    body: 'Wash cold, inside out. Do not bleach. Hang dry or tumble low. Do not iron directly on the print.',
  },
  {
    title: 'Find the perfect fit',
    body: 'Our jerseys follow a regular athletic replica fit — true to size for most fans. Prefer a looser street look? Size up. Between sizes? Choose the larger size for comfort across the chest and shoulders.',
  },
  {
    title: 'Shipping & returns',
    body: 'Orders typically leave the warehouse within 1–2 working days. Contact the store within 7 days if a piece does not fit as expected.',
  },
  {
    title: 'Payment methods',
    body: 'Pay securely online with Razorpay — UPI, cards, and net banking. Free delivery on orders above ₹2,000.',
  },
];

export function ProductAccordions(): React.JSX.Element {
  const [open, setOpen] = useState<string | null>(ITEMS[0]?.title ?? null);
  const reduced = useReducedMotion();

  return (
    <div className="border-t border-foreground/10 pt-6">
      {ITEMS.map((item) => {
        const expanded = open === item.title;
        return (
          <div key={item.title} className="border-b border-foreground/10">
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between py-4 text-left text-sm font-semibold uppercase tracking-[0.14em]"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : item.title)}
            >
              {item.title}
              <span aria-hidden="true">{expanded ? '–' : '+'}</span>
            </button>
            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.div
                  key={`${item.title}-body`}
                  initial={reduced ? { opacity: 1 } : { height: 0, opacity: 0 }}
                  animate={reduced ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                  exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: MOTION_DURATION, ease: MOTION_EASE }}
                  className="overflow-hidden"
                >
                  <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
