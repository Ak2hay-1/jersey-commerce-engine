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
    <Stagger className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-10 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        <StaggerItem key={product.id} className="h-full">
          <ProductCard product={product} currency={currency} priority={index < 4} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}
