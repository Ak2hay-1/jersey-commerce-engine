import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
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
      className="group relative block aspect-[4/5] overflow-hidden rounded-[calc(var(--radius)+4px)] bg-[hsl(var(--surface-1))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ProductImage
        src={image}
        alt={category.name}
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        sizes="(max-width: 768px) 50vw, 25vw"
        fill
      />
      {overlay}
      <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 z-[3] flex items-end justify-between gap-2 p-3 text-white sm:p-5">
        <h3 className="font-display break-words text-[clamp(1.35rem,3vw,2rem)]">{category.name}</h3>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur transition-colors group-hover:bg-white group-hover:text-black">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
