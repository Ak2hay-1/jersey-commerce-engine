import Link from 'next/link';
import type { CategoryDetail, CategorySummary } from '@jersey-commerce/types';
import { ProductImage } from './product-image';

export function CategoryCard({
  category,
  href,
}: {
  category: CategorySummary | CategoryDetail;
  href?: string;
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
        className="aspect-[4/5] w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        sizes="(max-width: 768px) 50vw, 25vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <h3 className="font-heading text-2xl uppercase tracking-wide">{category.name}</h3>
      </div>
    </Link>
  );
}
