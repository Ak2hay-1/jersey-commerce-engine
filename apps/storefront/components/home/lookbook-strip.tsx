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
    street ? { category: street, kicker: 'Street', href: `/category/${street.slug}` } : null,
    pitch ? { category: pitch, kicker: 'Pitch', href: `/category/${pitch.slug}` } : null,
  ].filter((item): item is { category: CategoryDetail; kicker: string; href: string } => Boolean(item));

  return (
    <section className="grid md:grid-cols-2">
      {tiles.map((tile, index) => (
        <Reveal key={tile.category.id} delay={index * 0.08}>
          <Link href={tile.href} className="group relative block min-h-[22rem] overflow-hidden bg-muted md:min-h-[32rem]">
            <ProductImage
              src={tile.category.image}
              alt={tile.category.name}
              className="h-full min-h-[22rem] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 md:min-h-[32rem]"
              sizes="50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-8 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">{tile.kicker}</p>
              <h3 className="mt-2 font-heading text-4xl uppercase md:text-5xl">{tile.category.name}</h3>
            </div>
          </Link>
        </Reveal>
      ))}
    </section>
  );
}
