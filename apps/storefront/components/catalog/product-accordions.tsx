'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Plus } from 'lucide-react';
import { cn } from '@jersey-commerce/ui';
import { MOTION_DURATION, MOTION_EASE } from '../motion/presence';

export const OPEN_ACCORDION_EVENT = 'pdp:open-accordion';

type Item = { id: string; title: string; body: string };

const STATIC_ITEMS: Item[] = [
  {
    id: 'fit',
    title: 'Size & fit',
    body: 'Our jerseys follow a regular athletic replica fit — true to size for most fans. Prefer a looser street look? Size up. Between sizes? Choose the larger size for comfort across the chest and shoulders.',
  },
  {
    id: 'care',
    title: 'Care instructions',
    body: 'Wash cold, inside out. Do not bleach. Hang dry or tumble low. Do not iron directly on the print.',
  },
  {
    id: 'shipping',
    title: 'Shipping & returns',
    body: 'Orders typically leave the warehouse within 1–2 working days. Contact the store within 7 days if a piece does not fit as expected.',
  },
  {
    id: 'payment',
    title: 'Payment methods',
    body: 'Pay securely online with Razorpay — UPI, cards, and net banking. Free delivery on orders above ₹2,000.',
  },
];

export function openProductAccordion(id: string): void {
  window.dispatchEvent(new CustomEvent(OPEN_ACCORDION_EVENT, { detail: id }));
  document.getElementById(`pdp-accordion-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function ProductAccordions({ description }: { description?: string | null }): React.JSX.Element {
  const items = useMemo<Item[]>(
    () => (description?.trim() ? [{ id: 'details', title: 'Details', body: description.trim() }, ...STATIC_ITEMS] : STATIC_ITEMS),
    [description],
  );
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null);
  const reduced = useReducedMotion();

  useEffect(() => {
    function onOpen(event: Event) {
      const id = (event as CustomEvent<string>).detail;
      if (typeof id === 'string') {
        setOpen(id);
      }
    }
    window.addEventListener(OPEN_ACCORDION_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_ACCORDION_EVENT, onOpen);
  }, []);

  return (
    <div className="border-t border-white/10">
      {items.map((item) => {
        const expanded = open === item.id;
        return (
          <div key={item.id} id={`pdp-accordion-${item.id}`} className="scroll-mt-28 border-b border-white/10">
            <button
              type="button"
              className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 py-4 text-left font-heading text-base font-bold uppercase tracking-[0.08em]"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : item.id)}
            >
              {item.title}
              <Plus
                className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300', expanded && 'rotate-45')}
                aria-hidden
              />
            </button>
            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.div
                  key={`${item.id}-body`}
                  initial={reduced ? { opacity: 1 } : { height: 0, opacity: 0 }}
                  animate={reduced ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                  exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: MOTION_DURATION, ease: MOTION_EASE }}
                  className="overflow-hidden"
                >
                  <p className="whitespace-pre-line pb-5 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
