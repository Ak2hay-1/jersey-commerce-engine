'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { MOTION_EASE } from './presence';

export function HeroCopy({ children }: { children: ReactNode }): React.JSX.Element {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="max-w-5xl"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: reduced ? 0 : 0.12,
            delayChildren: reduced ? 0 : 0.18,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function HeroCopyItem({ children, className }: { children: ReactNode; className?: string }): React.JSX.Element {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.55, ease: MOTION_EASE },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
