'use client';

import type { HomepageSection } from '@jersey-commerce/types';
import { SplitHeading } from '../motion/split-heading';
import { useStore } from '../providers/store-provider';

export function StatementSection({ section: sectionProp }: { section: HomepageSection }): React.JSX.Element {
  const store = useStore();
  const section = store.website.homepage.sections.find((item) => item.type === 'statement') ?? sectionProp;
  return (
    <section className="mx-auto max-w-store store-gutter py-[var(--space-section)] text-center">
      <SplitHeading as="h2" text={section.heading || 'WEAR THE GAME'} />
      {section.subheading ? (
        <p className="mx-auto mt-6 max-w-xl break-words text-sm leading-relaxed text-muted-foreground sm:text-base">
          {section.subheading}
        </p>
      ) : null}
    </section>
  );
}
