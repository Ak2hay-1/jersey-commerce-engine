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
          <Link
            href={tile.href}
            className="group relative block min-h-[20rem] overflow-hidden bg-[hsl(var(--hero-plane))] sm:min-h-[24rem] md:min-h-[36rem]"
          >
            <ProductImage
              src={tile.category.image}
              alt={tile.category.name}
              className="h-full min-h-[20rem] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 sm:min-h-[24rem] md:min-h-[36rem]"
              sizes={dual ? '(max-width: 768px) 100vw, 50vw' : '100vw'}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,rgba(122,31,31,0.25),transparent_55%)] opacity-80" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-8 md:p-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[hsl(var(--accent))]">{tile.kicker}</p>
              <h3 className="mt-2 break-words font-heading text-3xl uppercase sm:text-4xl md:text-5xl">{tile.category.name}</h3>
            </div>
          </Link>
        </Reveal>
      ))}
    </section>
  );
}
