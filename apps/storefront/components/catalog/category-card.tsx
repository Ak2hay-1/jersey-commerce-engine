import Link from 'next/link';
import type { ReactNode } from 'react';
import type { CategoryDetail, CategorySummary } from '@jersey-commerce/types';
import { ProductImage } from './product-image';

export function CategoryCard({
  category,
  href,
  overlay,
}: {
  category: CategorySummary | CategoryDetail;
  href?: string;
  overlay?: ReactNode;
}): React.JSX.Element {
  const image = 'image' in category ? category.image : null;
  return (
    <Link
      href={href ?? `/category/${category.slug}`}
      className="group relative block overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ProductImage
        src={image}
        alt={category.name}
        className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        sizes="(max-width: 768px) 50vw, 25vw"
      />
      {overlay}
      <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/80 via-black/25 to-transparent transition-colors duration-500 group-hover:from-black/90" />
      <div className="absolute inset-x-0 bottom-0 z-[3] p-4 text-white transition-transform duration-500 ease-out group-hover:-translate-y-1">
        <h3 className="font-heading text-2xl uppercase tracking-wide">{category.name}</h3>
      </div>
    </Link>
  );
}
