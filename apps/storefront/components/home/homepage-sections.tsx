import Link from 'next/link';
import type { HomepageSection, StorefrontProductListItem } from '@jersey-commerce/types';
import type { CategoryDetail } from '@jersey-commerce/types';
import { ProductGrid } from '../catalog/product-grid';
import { CategoryCard } from '../catalog/category-card';
import { Stagger, StaggerItem } from '../motion/stagger';
import { ScrollHeading } from '../motion/scroll-heading';
import { Magnetic } from '../motion/magnetic';
import { Reveal } from '../motion/reveal';

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
    <section className="mx-auto max-w-store px-4 py-14 md:py-16">
      {section.heading ? <ScrollHeading kicker="Collections">{section.heading}</ScrollHeading> : null}
      <Stagger className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
        {categories.map((category) => (
          <StaggerItem key={category.id}>
            <div className="overflow-hidden rounded-[1.5rem]">
              <CategoryCard category={category} />
            </div>
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
  if (products.length === 0) {
    return null;
  }
  return (
    <section className="py-14 md:py-16">
      <div className="mx-auto max-w-store px-4">
        {section.heading ? <ScrollHeading kicker="Shop">{section.heading}</ScrollHeading> : null}
        <div className="mt-8">
          <ProductGrid products={products} currency={currency} />
        </div>
      </div>
    </section>
  );
}

export function PromoBanner({ section }: { section: HomepageSection }): React.JSX.Element {
  return (
    <section className="mx-auto max-w-store px-4 py-8">
      <Reveal>
        <div className="glass-panel flex flex-col items-start justify-between gap-6 rounded-[2rem] px-6 py-10 md:flex-row md:items-center md:px-10">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Limited drop</p>
            <h2 className="mt-2 font-heading text-3xl font-extrabold uppercase tracking-tight md:text-5xl">{section.heading}</h2>
            {section.subheading ? <p className="mt-3 max-w-xl text-sm uppercase tracking-[0.08em] text-muted-foreground">{section.subheading}</p> : null}
          </div>
          {section.ctaLabel && section.ctaHref ? (
            <Magnetic>
              <Link href={section.ctaHref} className="store-pill bg-foreground px-7 py-2.5 text-background">
                {section.ctaLabel}
              </Link>
            </Magnetic>
          ) : null}
        </div>
      </Reveal>
    </section>
  );
}

export function TrustSection({ section }: { section: HomepageSection }): React.JSX.Element | null {
  if (!section.items?.length) {
    return null;
  }
  return (
    <section className="border-y border-border/70">
      <Stagger className="mx-auto grid max-w-store gap-10 px-4 py-14 md:grid-cols-4 md:py-16">
        {section.items.map((item) => (
          <StaggerItem key={item.title}>
            <h3 className="font-heading text-lg font-extrabold uppercase tracking-wide md:text-xl">{item.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

export function CtaSection({ section }: { section: HomepageSection }): React.JSX.Element {
  return (
    <section className="mx-auto max-w-store px-4 py-10">
      <Reveal>
        <div className="rounded-[2rem] bg-foreground px-6 py-16 text-center text-background md:px-10 md:py-20">
          <h2 className="font-heading text-4xl font-extrabold uppercase tracking-tight md:text-6xl">{section.heading}</h2>
          {section.subheading ? (
            <p className="mx-auto mt-4 max-w-lg text-sm uppercase tracking-[0.1em] text-background/70 md:text-base">{section.subheading}</p>
          ) : null}
          {section.ctaLabel && section.ctaHref ? (
            <Magnetic className="mt-8 inline-block">
              <Link href={section.ctaHref} className="store-pill bg-background px-8 py-3 text-foreground">
                {section.ctaLabel}
              </Link>
            </Magnetic>
          ) : null}
        </div>
      </Reveal>
    </section>
  );
}
