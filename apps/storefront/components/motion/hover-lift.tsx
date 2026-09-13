'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { MOTION_DURATION, MOTION_EASE } from './presence';

/**
 * Soft hover lift for product tiles (Motion Primitives–inspired).
 * Disabled for reduced motion and non-hover devices via CSS elsewhere.
 */
export function HoverLift({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): React.JSX.Element {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      whileHover={reduced ? undefined : { y: -4 }}
      transition={{ duration: MOTION_DURATION, ease: MOTION_EASE }}
    >
      {children}
    </motion.div>
  );
}
