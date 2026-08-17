import Link from 'next/link';
import type { StorefrontProductListItem } from '@jersey-commerce/types';
import { PriceDisplay } from './price-display';
import { ProductImage } from './product-image';
import { availabilityLabel } from '../../lib/format';

export function ProductCard({
  product,
  currency = 'INR',
}: {
  product: StorefrontProductListItem;
  currency?: string;
}): React.JSX.Element {
  const out = product.availability === 'OUT_OF_STOCK';
  return (
    <article className="product-tile group">
      <Link href={`/products/${product.slug}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="product-tile-media relative overflow-hidden bg-muted transition-shadow duration-500 group-hover:shadow-card">
          <ProductImage
            src={product.primaryImage?.url}
            alt={product.primaryImage?.altText ?? product.name}
            className="aspect-[3/4] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
          <span className="product-tile-overlay pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/10" />
          {out ? (
            <span className="absolute left-3 top-3 z-[1] bg-background/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider">
              {availabilityLabel(product.availability, null)}
            </span>
          ) : null}
          <span className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] translate-y-full bg-foreground/85 px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-background transition-transform duration-300 ease-out group-hover:translate-y-0">
            View
          </span>
        </div>
        <div className="space-y-1 pt-3">
          {product.brand ? <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{product.brand}</p> : null}
          <h3 className="product-tile-title font-heading text-lg uppercase leading-tight tracking-wide">{product.name}</h3>
          <PriceDisplay price={product.lowestPrice} compareAt={product.compareAtPrice} currency={currency} size="sm" />
        </div>
      </Link>
    </article>
  );
}
