import type { StorefrontProductListItem } from '@jersey-commerce/types';
import { ProductCard } from './product-card';
import { Stagger, StaggerItem } from '../motion/stagger';

export function ProductGrid({
  products,
  currency = 'INR',
}: {
  products: StorefrontProductListItem[];
  currency?: string;
}): React.JSX.Element {
  return (
    <Stagger className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 sm:gap-y-8 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <StaggerItem key={product.id}>
          <ProductCard product={product} currency={currency} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}
