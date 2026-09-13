'use client';

import type { HomepageSection } from '@jersey-commerce/types';
import { SplitHeading } from '../motion/split-heading';
import { useStore } from '../providers/store-provider';

export function StatementSection({ section: sectionProp }: { section: HomepageSection }): React.JSX.Element {
  const store = useStore();
  const section = store.website.homepage.sections.find((item) => item.type === 'statement') ?? sectionProp;
  return (
    <section className="home-pitch relative overflow-hidden border-y border-foreground/10 py-[var(--space-section)]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(122,31,31,0.18),transparent_60%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-store store-gutter text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[hsl(var(--accent))]">Match day</p>
        <div className="mt-4">
          <SplitHeading as="h2" text={section.heading || 'WEAR THE GAME'} />
        </div>
        {section.subheading ? (
          <p className="mx-auto mt-6 max-w-xl break-words text-sm leading-relaxed text-muted-foreground sm:text-base">
            {section.subheading}
          </p>
        ) : null}
      </div>
    </section>
  );
}
