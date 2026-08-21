'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef, type ReactNode } from 'react';

export function ScrollHeading({
  children,
  kicker,
}: {
  children: ReactNode;
  kicker?: string;
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.92', 'start 0.45'] });
  const opacity = useTransform(scrollYProgress, [0, 1], [reduced ? 1 : 0.28, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [reduced ? 0 : 32, 0]);

  return (
    <motion.div ref={ref} style={{ opacity, y }}>
      {kicker ? <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{kicker}</p> : null}
      <h2 className="mt-2 break-words font-heading text-2xl uppercase tracking-wide md:text-4xl">{children}</h2>
    </motion.div>
  );
}
