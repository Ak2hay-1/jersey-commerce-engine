'use client';

import { useReducedMotion } from 'motion/react';
import { cn } from '@jersey-commerce/ui';

function Row({ text, reverse }: { text: string; reverse?: boolean }): React.JSX.Element {
  const pieces = Array.from({ length: 8 }, () => text);
  return (
    <div className="overflow-hidden">
      <div className={cn('marquee-track gap-6 py-3', reverse && 'marquee-track-reverse')}>
        {[...pieces, ...pieces].map((item, index) => (
          <span key={`${item}-${index}`} className="inline-flex items-center gap-6 whitespace-nowrap px-2">
            <span>{item}</span>
            <span aria-hidden="true">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function DualMarquee({
  heading,
  subheading,
  inverted = false,
}: {
  heading: string;
  subheading?: string;
  inverted?: boolean;
}): React.JSX.Element | null {
  const reduced = useReducedMotion();
  const primary = heading.trim();
  if (!primary) {
    return null;
  }
  const secondary = subheading?.trim() || primary;

  return (
    <section
      className={cn(
        'border-y border-foreground/10 font-heading text-2xl uppercase tracking-[0.14em] md:text-4xl',
        inverted ? 'bg-foreground text-background' : 'bg-transparent text-foreground',
      )}
      aria-hidden={reduced ? undefined : true}
    >
      {reduced ? (
        <p className="px-4 py-4 text-center">{primary}</p>
      ) : (
        <>
          <Row text={primary} />
          <div className="editorial-rule opacity-40" />
          <Row text={secondary} reverse />
        </>
      )}
    </section>
  );
}
