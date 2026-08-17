'use client';

import { motion, useReducedMotion } from 'motion/react';

export function Ticker({ items }: { items: string[] }): React.JSX.Element | null {
  const reduced = useReducedMotion();
  if (items.length === 0) {
    return null;
  }
  const row = [...items, ...items, ...items];

  return (
    <div className="overflow-hidden border-y border-border bg-foreground py-3 text-background">
      <motion.div
        className="flex w-max gap-10 whitespace-nowrap font-heading text-xl uppercase tracking-[0.2em]"
        animate={reduced ? undefined : { x: ['0%', '-33.333%'] }}
        transition={reduced ? undefined : { duration: 28, repeat: Infinity, ease: 'linear' }}
      >
        {row.map((item, index) => (
          <span key={`${item}-${index}`} className="px-2">
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
