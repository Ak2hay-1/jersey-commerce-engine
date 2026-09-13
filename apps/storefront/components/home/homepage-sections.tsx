import Link from 'next/link';
import type { HomepageSection, StorefrontProductListItem } from '@jersey-commerce/types';
import type { CategoryDetail } from '@jersey-commerce/types';
import { CategoryCard } from '../catalog/category-card';
import { Stagger, StaggerItem } from '../motion/stagger';
import { ScrollHeading } from '../motion/scroll-heading';
import { Magnetic } from '../motion/magnetic';
import { Reveal } from '../motion/reveal';
import { DualMarquee } from './dual-marquee';
import { LatestDrop } from './latest-drop';
import { CollectionGrid } from './collection-grid';

export { StatementSection } from './statement-section';
export { CollectionGrid } from './collection-grid';
export { TrendingSection } from './trending-section';
export { LimitedEditionBand } from './limited-edition-band';

export function FeaturedCategories({
  section,
  categories,
}: {
  section: HomepageSection;
  categories: CategoryDetail[];
}): React.JSX.Element | null {
  if (categories.length === 0) {
    return null;
  }
  return (
    <section className="mx-auto max-w-store store-gutter py-[var(--space-section)]">
      {section.heading ? <ScrollHeading kicker="Collections">{section.heading}</ScrollHeading> : null}
      <Stagger className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mt-10 lg:grid-cols-3">
        {categories.map((category) => (
          <StaggerItem key={category.id}>
            <CategoryCard category={category} />
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

export function FeaturedProducts({
  section,
  products,
  currency,
}: {
  section: HomepageSection;
  products: StorefrontProductListItem[];
  currency: string;
}): React.JSX.Element | null {
  return <CollectionGrid section={section} products={products} currency={currency} />;
}

export function PromoBanner({ section }: { section: HomepageSection }): React.JSX.Element {
  return (
    <section className="mx-auto max-w-store store-gutter py-[var(--space-section)]">
      <Reveal>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--accent))]">Premium</p>
        <h2 className="mt-4 max-w-4xl break-words font-heading text-[clamp(2rem,8vw,4.5rem)] uppercase leading-[0.92] md:text-7xl">
          {section.heading}
        </h2>
        {section.subheading ? (
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">{section.subheading}</p>
        ) : null}
        {section.ctaLabel && section.ctaHref ? (
          <Magnetic className="mt-8 inline-block">
            <Link href={section.ctaHref} className="store-pill-accent cursor-pointer px-7 py-3">
              {section.ctaLabel}
            </Link>
          </Magnetic>
        ) : null}
      </Reveal>
    </section>
  );
}

export function TrustSection({ section }: { section: HomepageSection }): React.JSX.Element | null {
  if (!section.items?.length) {
    return null;
  }
  return (
    <section className="home-pitch border-y border-foreground/10">
      <Stagger className="mx-auto grid max-w-store gap-8 store-gutter py-[var(--space-section)] sm:grid-cols-2 md:gap-10 lg:grid-cols-4">
        {section.items.map((item) => (
          <StaggerItem key={item.title}>
            <div className="h-0.5 w-8 bg-[hsl(var(--accent))]" aria-hidden />
            <h3 className="mt-4 font-heading text-2xl uppercase tracking-wide">{item.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

export function CtaSection({ section }: { section: HomepageSection }): React.JSX.Element {
  return (
    <section className="mx-auto max-w-store store-gutter py-[var(--space-section)]">
      <Reveal>
        <div className="bg-[hsl(var(--accent))] px-5 py-14 text-center text-[hsl(var(--accent-foreground))] md:px-10 md:py-24">
          <h2 className="break-words font-heading text-[clamp(1.75rem,7vw,3.75rem)] uppercase tracking-tight md:text-6xl">
            {section.heading}
          </h2>
          {section.subheading ? (
            <p className="mx-auto mt-4 max-w-lg text-sm uppercase tracking-[0.1em] text-white/75 md:text-base">
              {section.subheading}
            </p>
          ) : null}
          {section.ctaLabel && section.ctaHref ? (
            <Magnetic className="mt-8 inline-block">
              <Link
                href={section.ctaHref}
                className="store-pill cursor-pointer border border-white/30 bg-white px-8 py-3 text-foreground"
              >
                {section.ctaLabel}
              </Link>
            </Magnetic>
          ) : null}
        </div>
      </Reveal>
    </section>
  );
}

export { DualMarquee, LatestDrop };
