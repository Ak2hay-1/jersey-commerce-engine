import Link from 'next/link';
import type { CategoryDetail } from '@jersey-commerce/types';
import { ProductImage } from '../catalog/product-image';
import { Reveal } from '../motion/reveal';

export function LookbookStrip({
  street,
  pitch,
}: {
  street?: CategoryDetail;
  pitch?: CategoryDetail;
}): React.JSX.Element | null {
  if (!street && !pitch) {
    return null;
  }
  const tiles = [
    street ? { category: street, kicker: 'Club', href: `/category/${street.slug}` } : null,
    pitch ? { category: pitch, kicker: 'National', href: `/category/${pitch.slug}` } : null,
  ].filter((item): item is { category: CategoryDetail; kicker: string; href: string } => Boolean(item));

  const dual = tiles.length > 1;

  return (
    <section className={dual ? 'grid md:grid-cols-2' : 'grid'}>
      {tiles.map((tile, index) => (
        <Reveal key={tile.category.id} delay={index * 0.08}>
          <Link href={tile.href} className="group relative block min-h-[18rem] overflow-hidden bg-muted sm:min-h-[22rem] md:min-h-[32rem]">
            <ProductImage
              src={tile.category.image}
              alt={tile.category.name}
              className="h-full min-h-[18rem] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 sm:min-h-[22rem] md:min-h-[32rem]"
              sizes={dual ? '(max-width: 768px) 100vw, 50vw' : '100vw'}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">{tile.kicker}</p>
              <h3 className="mt-2 break-words font-heading text-3xl uppercase sm:text-4xl md:text-5xl">{tile.category.name}</h3>
            </div>
          </Link>
        </Reveal>
      ))}
    </section>
  );
}
