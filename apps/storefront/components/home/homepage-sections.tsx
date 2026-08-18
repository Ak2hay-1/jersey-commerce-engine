import Link from 'next/link';
import type { HomepageSection, StorefrontProductListItem } from '@jersey-commerce/types';
import type { CategoryDetail } from '@jersey-commerce/types';
import { ProductGrid } from '../catalog/product-grid';
import { CategoryCard } from '../catalog/category-card';
import { Stagger, StaggerItem } from '../motion/stagger';
import { ScrollHeading } from '../motion/scroll-heading';
import { Magnetic } from '../motion/magnetic';
import { Reveal } from '../motion/reveal';
import { SplitHeading } from '../motion/split-heading';
import { DualMarquee } from './dual-marquee';
import { LatestDrop } from './latest-drop';
import { PriceDisplay } from '../catalog/price-display';
import { ProductImage } from '../catalog/product-image';

export function StatementSection({ section }: { section: HomepageSection }): React.JSX.Element {
  return (
    <section className="mx-auto max-w-store px-4 py-20 text-center md:py-28">
      <SplitHeading as="h2" text={section.heading || 'NOT FOR EVERYONE'} />
      {section.subheading ? (
        <p className="mx-auto mt-6 max-w-xl text-sm uppercase tracking-[0.14em] text-muted-foreground">{section.subheading}</p>
      ) : null}
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
    <section className="mx-auto max-w-store px-4 py-16 md:py-24">
      {section.heading ? <ScrollHeading kicker="Collections">{section.heading}</ScrollHeading> : null}
      <Stagger className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
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
  if (products.length === 0) {
    return null;
  }
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-store px-4">
        {section.heading ? <ScrollHeading kicker="Shop">{section.heading}</ScrollHeading> : null}
        <div className="mt-10 hidden gap-8 lg:grid lg:grid-cols-3">
          {products.slice(0, 6).map((product) => (
            <article key={product.id} className="group">
              <Link href={`/products/${product.slug}`} className="block">
                <div className="overflow-hidden bg-muted">
                  <ProductImage
                    src={product.primaryImage?.url}
                    alt={product.primaryImage?.altText ?? product.name}
                    className="aspect-[3/4] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <h3 className="mt-4 font-heading text-2xl uppercase leading-tight">{product.name}</h3>
                <PriceDisplay price={product.lowestPrice} compareAt={product.compareAtPrice} currency={currency} size="sm" />
                {product.brand ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{product.brand} · limited drop</p> : null}
              </Link>
            </article>
          ))}
        </div>
        <div className="mt-8 lg:hidden">
          <ProductGrid products={products.slice(0, 6)} currency={currency} />
        </div>
      </div>
    </section>
  );
}

export function PromoBanner({ section }: { section: HomepageSection }): React.JSX.Element {
  return (
    <section className="mx-auto max-w-store px-4 py-16 md:py-24">
      <Reveal>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Premium</p>
        <h2 className="mt-4 max-w-4xl font-heading text-5xl uppercase leading-[0.92] md:text-7xl">{section.heading}</h2>
        {section.subheading ? (
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">{section.subheading}</p>
        ) : null}
        {section.ctaLabel && section.ctaHref ? (
          <Magnetic className="mt-8 inline-block">
            <Link href={section.ctaHref} className="store-pill border border-foreground px-7 py-3">
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
    <section className="border-y border-foreground/10">
      <Stagger className="mx-auto grid max-w-store gap-10 px-4 py-16 md:grid-cols-4 md:py-20">
        {section.items.map((item) => (
          <StaggerItem key={item.title}>
            <h3 className="font-heading text-2xl uppercase tracking-wide">{item.title}</h3>
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
        <div className="bg-foreground px-6 py-16 text-center text-background md:px-10 md:py-24">
          <h2 className="font-heading text-4xl uppercase tracking-tight md:text-6xl">{section.heading}</h2>
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

export { DualMarquee, LatestDrop };
