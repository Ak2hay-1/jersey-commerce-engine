'use client';

import { motion, useReducedMotion } from 'motion/react';
import { MOTION_EASE } from './presence';

export function SplitHeading({ text }: { text: string }): React.JSX.Element {
  const reduced = useReducedMotion();
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <h1 className="mt-4 font-heading text-6xl uppercase leading-[0.82] tracking-wide md:text-8xl lg:text-[10vw]">
      {words.map((word, index) => (
        <span key={`${word}-${index}`} className="inline-block overflow-hidden align-bottom">
          <motion.span
            className="inline-block"
            variants={{
              hidden: reduced ? { y: 0 } : { y: '110%' },
              show: {
                y: 0,
                transition: { duration: 0.7, ease: MOTION_EASE },
              },
            }}
          >
            {word}
            {index < words.length - 1 ? '\u00a0' : null}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}
