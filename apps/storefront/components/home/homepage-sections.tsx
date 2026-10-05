import Link from 'next/link';
import { ArrowRight, BadgeCheck, Lock, RotateCcw, Shirt, Sparkles, Truck } from 'lucide-react';
import type { HomepageSection, StorefrontProductListItem } from '@jersey-commerce/types';
import type { CategoryDetail } from '@jersey-commerce/types';
import { CategoryCard } from '../catalog/category-card';
import { Stagger, StaggerItem } from '../motion/stagger';
import { Reveal } from '../motion/reveal';
import { LatestDrop } from './latest-drop';
import { CollectionGrid } from './collection-grid';
import { EditorialBanner } from './editorial-banner';

export { CollectionGrid } from './collection-grid';
export { EditorialBanner } from './editorial-banner';

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
  const listed = categories.slice(0, 4);
  const columns = listed.length >= 4 ? 'lg:grid-cols-4' : listed.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2';
  return (
    <section className="py-[var(--space-section)]">
      <div className="mx-auto max-w-store store-gutter">
        <Reveal className="section-head">
          <div>
            <p className="section-kicker">Collections</p>
            <h2 className="section-title">{section.heading || 'Shop by kit'}</h2>
          </div>
          <Link href="/products" className="section-link">
            All jerseys
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
        <Stagger className={`mt-8 grid grid-cols-2 gap-3 sm:gap-5 md:mt-10 ${columns}`}>
          {listed.map((category) => (
            <StaggerItem key={category.id}>
              <CategoryCard category={category} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
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

export function PromoBanner({
  section,
  image,
  imageAlt,
  kicker = 'Premium',
  reverse,
}: {
  section: HomepageSection;
  image?: string | null;
  imageAlt?: string;
  kicker?: string;
  reverse?: boolean;
}): React.JSX.Element {
  return (
    <EditorialBanner
      kicker={kicker}
      heading={section.heading || 'Master versions'}
      subheading={section.subheading}
      ctaLabel={section.ctaLabel || 'Shop the range'}
      ctaHref={section.ctaHref || '/products'}
      image={section.image || image}
      imageAlt={imageAlt}
      reverse={reverse}
    />
  );
}

function trustIcon(title: string): React.ComponentType<{ className?: string }> {
  const value = title.toLowerCase();
  if (/(deliver|ship)/.test(value)) {
    return Truck;
  }
  if (/(return|exchange|refund)/.test(value)) {
    return RotateCcw;
  }
  if (/(authentic|quality|premium|original)/.test(value)) {
    return BadgeCheck;
  }
  if (/(secure|pay|checkout)/.test(value)) {
    return Lock;
  }
  if (/(custom|name|number|print)/.test(value)) {
    return Shirt;
  }
  return Sparkles;
}

export function TrustSection({ section }: { section: HomepageSection }): React.JSX.Element | null {
  if (!section.items?.length) {
    return null;
  }
  return (
    <section className="py-[calc(var(--space-section)*0.6)]">
      <div className="mx-auto max-w-store store-gutter">
        <Stagger className="panel grid divide-y divide-white/[0.08] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
          {section.items.map((item) => {
            const Icon = trustIcon(item.title);
            return (
              <StaggerItem key={item.title} className="flex gap-4 p-5 sm:p-6 lg:p-8">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent)/0.14)] text-[hsl(var(--accent))]">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-heading text-lg uppercase tracking-wide">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}

export function CtaSection({ section }: { section: HomepageSection }): React.JSX.Element {
  return (
    <section className="pb-[var(--space-section)] pt-[calc(var(--space-section)*0.6)]">
      <div className="mx-auto max-w-store store-gutter">
        <Reveal>
          <div className="relative overflow-hidden rounded-[calc(var(--radius)+6px)] border border-white/10 bg-[hsl(var(--surface-1))] px-6 py-14 text-center sm:px-10 md:py-20">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_120%,hsl(var(--accent)/0.45),transparent_70%)]"
              aria-hidden
            />
            <div className="relative">
              <p className="section-kicker justify-center">Your kit, your way</p>
              <h2 className="font-display mx-auto mt-4 max-w-3xl text-[clamp(2.25rem,6vw,4.5rem)]">
                {section.heading || 'Find your jersey'}
              </h2>
              {section.subheading ? (
                <p className="mx-auto mt-4 max-w-lg text-[15px] text-muted-foreground sm:text-base">{section.subheading}</p>
              ) : null}
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href={section.ctaHref || '/products'} className="btn btn-lg btn-primary cursor-pointer">
                  {section.ctaLabel || 'Browse all jerseys'}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/custom-orders" className="btn btn-lg btn-secondary cursor-pointer">
                  Design a custom kit
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export { LatestDrop };
