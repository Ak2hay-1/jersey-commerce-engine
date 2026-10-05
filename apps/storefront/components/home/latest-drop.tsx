import type { HomepageSection, StorefrontProductListItem } from '@jersey-commerce/types';
import { ProductRail } from '../catalog/product-rail';

export function LatestDrop({
  section,
  products,
  currency,
  kicker = 'Just dropped',
  viewAllHref = '/products?sort=newest',
}: {
  section: HomepageSection;
  products: StorefrontProductListItem[];
  currency: string;
  kicker?: string;
  viewAllHref?: string;
}): React.JSX.Element | null {
  return (
    <ProductRail
      kicker={kicker}
      title={section.heading || 'Latest drops'}
      products={products}
      currency={currency}
      viewAllHref={section.ctaHref || viewAllHref}
      viewAllLabel={section.ctaLabel || 'View all'}
    />
  );
}
