import Link from 'next/link';
import type { HomepageSection, StorefrontProductListItem } from '@jersey-commerce/types';
import type { CategoryDetail } from '@jersey-commerce/types';
import { Button } from '@jersey-commerce/ui';
import { ProductGrid } from '../catalog/product-grid';
import { CategoryCard } from '../catalog/category-card';
import { ProductImage } from '../catalog/product-image';

export function HeroSection({ section }: { section: HomepageSection }): React.JSX.Element {
  return (
    <section className="relative overflow-hidden bg-foreground text-background">
      <div className="mx-auto grid max-w-store items-center gap-8 px-4 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">{section.subheading ? 'New season' : 'Store'}</p>
          <h1 className="mt-3 font-heading text-5xl uppercase leading-[0.9] tracking-wide md:text-7xl">{section.heading}</h1>
          {section.subheading ? <p className="mt-4 max-w-md text-lg text-background/75">{section.subheading}</p> : null}
          {section.ctaLabel && section.ctaHref ? (
            <Button asChild size="lg" className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href={section.ctaHref}>{section.ctaLabel}</Link>
            </Button>
          ) : null}
        </div>
        {section.image ? (
          <ProductImage src={section.image} alt="" className="aspect-[4/5] w-full object-cover md:aspect-[5/6]" sizes="(max-width: 768px) 100vw, 50vw" priority />
        ) : null}
      </div>
    </section>
  );
}

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
    <section className="mx-auto max-w-store px-4 py-14">
      {section.heading ? <h2 className="font-heading text-3xl uppercase tracking-wide">{section.heading}</h2> : null}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
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
  if (products.length === 0) {
    return null;
  }
  return (
    <section className="mx-auto max-w-store px-4 py-14">
      {section.heading ? <h2 className="font-heading text-3xl uppercase tracking-wide">{section.heading}</h2> : null}
      <div className="mt-6">
        <ProductGrid products={products} currency={currency} />
      </div>
    </section>
  );
}

export function PromoBanner({ section }: { section: HomepageSection }): React.JSX.Element {
  return (
    <section className="bg-muted">
      <div className="mx-auto flex max-w-store flex-col items-start justify-between gap-4 px-4 py-12 md:flex-row md:items-center">
        <div>
          <h2 className="font-heading text-3xl uppercase tracking-wide">{section.heading}</h2>
          {section.subheading ? <p className="mt-2 text-muted-foreground">{section.subheading}</p> : null}
        </div>
        {section.ctaLabel && section.ctaHref ? (
          <Button asChild>
            <Link href={section.ctaHref}>{section.ctaLabel}</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}

export function TrustSection({ section }: { section: HomepageSection }): React.JSX.Element | null {
  if (!section.items?.length) {
    return null;
  }
  return (
    <section className="border-y border-border">
      <div className="mx-auto grid max-w-store gap-8 px-4 py-12 md:grid-cols-4">
        {section.items.map((item) => (
          <div key={item.title}>
            <h3 className="font-heading text-xl uppercase tracking-wide">{item.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CtaSection({ section }: { section: HomepageSection }): React.JSX.Element {
  return (
    <section className="mx-auto max-w-store px-4 py-16 text-center">
      <h2 className="font-heading text-4xl uppercase tracking-wide">{section.heading}</h2>
      {section.subheading ? <p className="mx-auto mt-3 max-w-lg text-muted-foreground">{section.subheading}</p> : null}
      {section.ctaLabel && section.ctaHref ? (
        <Button asChild size="lg" className="mt-6">
          <Link href={section.ctaHref}>{section.ctaLabel}</Link>
        </Button>
      ) : null}
    </section>
  );
}
