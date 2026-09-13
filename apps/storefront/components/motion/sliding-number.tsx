'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { MOTION_DURATION, MOTION_EASE } from './presence';

/**
 * Digit crossfade for cart counts (inspired by Motion Primitives Sliding Number).
 */
export function SlidingNumber({
  value,
  className,
}: {
  value: number;
  className?: string;
}): React.JSX.Element {
  const reduced = useReducedMotion();
  const display = value > 99 ? '99+' : String(value);

  if (reduced) {
    return <span className={className}>{display}</span>;
  }

  return (
    <span className={className}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={display}
          className="inline-block tabular-nums"
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -8, opacity: 0 }}
          transition={{ duration: MOTION_DURATION, ease: MOTION_EASE }}
        >
          {display}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
