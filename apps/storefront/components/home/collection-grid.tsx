import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { HomepageSection, StorefrontProductListItem } from '@jersey-commerce/types';
import { ProductGrid } from '../catalog/product-grid';
import { Reveal } from '../motion/reveal';

export function CollectionGrid({
  section,
  products,
  currency,
  kicker = 'Featured',
}: {
  section: HomepageSection;
  products: StorefrontProductListItem[];
  currency: string;
  kicker?: string;
}): React.JSX.Element | null {
  const listed = products.slice(0, 8);

  if (listed.length === 0) {
    return null;
  }

  return (
    <section className="py-[var(--space-section)]">
      <div className="mx-auto max-w-store store-gutter">
        <Reveal className="section-head">
          <div>
            <p className="section-kicker">{kicker}</p>
            <h2 className="section-title">{section.heading || 'Featured kits'}</h2>
          </div>
          <Link href={section.ctaHref || '/products'} className="section-link">
            {section.ctaLabel || 'Shop all'}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
        <div className="mt-8 md:mt-10">
          <ProductGrid products={listed} currency={currency} />
        </div>
      </div>
    </section>
  );
}
