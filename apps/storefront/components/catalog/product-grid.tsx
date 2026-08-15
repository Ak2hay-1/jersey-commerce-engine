import type { StorefrontProductListItem } from '@jersey-commerce/types';
import { ProductCard } from './product-card';

export function ProductGrid({
  products,
  currency = 'INR',
}: {
  products: StorefrontProductListItem[];
  currency?: string;
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} currency={currency} />
      ))}
    </div>
  );
}
