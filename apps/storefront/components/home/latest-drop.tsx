import Link from 'next/link';
import type { HomepageSection, StorefrontProductListItem } from '@jersey-commerce/types';
import { ProductCard } from '../catalog/product-card';
import { ScrollHeading } from '../motion/scroll-heading';

export function LatestDrop({
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
    <section className="py-12 md:py-24">
      <div className="mx-auto flex max-w-store flex-wrap items-end justify-between gap-3 store-gutter">
        {section.heading ? <ScrollHeading kicker="Drop">{section.heading}</ScrollHeading> : null}
        <Link href="/products?sort=newest" className="nav-link shrink-0 pb-1 text-[11px] font-semibold uppercase tracking-[0.2em]">
          View all
        </Link>
      </div>
      <div className="drop-scroll mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(1rem,env(safe-area-inset-left))] pb-2 md:gap-6">
        {products.map((product) => (
          <div key={product.id} className="w-[min(18.5rem,78vw)] shrink-0 snap-start sm:w-[42vw] md:w-[28vw] lg:w-[22rem]">
            <ProductCard product={product} currency={currency} />
          </div>
        ))}
      </div>
    </section>
  );
}
