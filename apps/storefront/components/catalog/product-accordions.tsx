'use client';

import { useState } from 'react';

const ITEMS = [
  {
    title: 'Care instructions',
    body: 'Wash cold, inside out. Do not bleach. Hang dry or tumble low. Do not iron directly on the print.',
  },
  {
    title: 'Find the perfect fit',
    body: 'Oversized tees are cut for a dropped shoulder and a longer hem. Size down for a closer fit. Jerseys follow a regular athletic replica silhouette — stick to your usual size.',
  },
  {
    title: 'Shipping & returns',
    body: 'Orders typically leave the warehouse within 1–2 working days. Contact the store within 7 days if a piece does not fit as expected.',
  },
  {
    title: 'Payment methods',
    body: 'Cash on delivery is available at checkout. Pay the rider when your order arrives. Online gateways will follow in a later drop.',
  },
];

export function ProductAccordions(): React.JSX.Element {
  const [open, setOpen] = useState<string | null>(ITEMS[0]?.title ?? null);
  return (
    <div className="border-t border-foreground/10 pt-6">
      {ITEMS.map((item) => {
        const expanded = open === item.title;
        return (
          <div key={item.title} className="border-b border-foreground/10">
            <button
              type="button"
              className="flex w-full items-center justify-between py-4 text-left text-sm font-semibold uppercase tracking-[0.14em]"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : item.title)}
            >
              {item.title}
              <span aria-hidden="true">{expanded ? '–' : '+'}</span>
            </button>
            {expanded ? <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{item.body}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
