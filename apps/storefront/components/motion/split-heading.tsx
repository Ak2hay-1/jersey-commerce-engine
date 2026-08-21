'use client';

import { motion, useReducedMotion } from 'motion/react';
import { MOTION_EASE } from './presence';

export function SplitHeading({
  text,
  as = 'h1',
  className = 'mt-4 break-words font-heading text-[clamp(2.1rem,11vw,6rem)] uppercase leading-[0.88] tracking-tight md:text-8xl lg:text-[9vw]',
}: {
  text: string;
  as?: 'h1' | 'h2';
  className?: string;
}): React.JSX.Element {
  const reduced = useReducedMotion();
  const words = text.split(/\s+/).filter(Boolean);
  const Tag = as === 'h2' ? motion.h2 : motion.h1;

  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: reduced ? 0 : 0.08 } },
      }}
    >
      {words.map((word, index) => (
        <span key={`${word}-${index}`} className="inline-block overflow-hidden align-bottom">
          <motion.span
            className="inline-block"
            variants={{
              hidden: reduced ? { y: 0, opacity: 1 } : { y: '40%', opacity: 1 },
              show: {
                y: 0,
                opacity: 1,
                transition: { duration: 0.7, ease: MOTION_EASE },
              },
            }}
          >
            {word}
            {index < words.length - 1 ? '\u00a0' : null}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}
