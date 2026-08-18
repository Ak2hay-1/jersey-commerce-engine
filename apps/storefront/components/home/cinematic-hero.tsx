import Link from 'next/link';
import type { HomepageSection, StorefrontProductListItem } from '@jersey-commerce/types';
import { HeroVisual } from '../motion/hero-visual';
import { Magnetic } from '../motion/magnetic';
import { resolveDemoMediaUrl } from '../../lib/demo-media';

export function CinematicHero({
  section,
  fallbackImage,
}: {
  section?: HomepageSection;
  fallbackImage?: StorefrontProductListItem['primaryImage'];
}): React.JSX.Element {
  const image = resolveDemoMediaUrl(section?.image || fallbackImage?.url);
  const heading = section?.heading?.trim() || 'New collection launched';
  const subheading = section?.subheading;
  const href = section?.ctaHref || '/products';
  const label = section?.ctaLabel || 'Shop the drop';

  return (
    <section className="relative h-[100svh] min-h-[36rem] overflow-hidden bg-[#111] text-white">
      {image ? <HeroVisual src={image} /> : <div className="absolute inset-0 bg-[#111]" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
      <div className="relative z-10 mx-auto flex h-full max-w-store flex-col justify-end px-4 pb-16 pt-28 md:pb-20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/80">{heading}</p>
        {subheading ? (
          <h1 className="mt-5 max-w-4xl font-heading text-5xl uppercase leading-[0.88] tracking-tight md:text-7xl lg:text-[6.4rem]">
            {subheading}
          </h1>
        ) : (
          <h1 className="mt-5 font-heading text-5xl uppercase leading-[0.88] md:text-7xl">Jerzyfy</h1>
        )}
        <Magnetic className="mt-8 inline-block w-fit">
          <Link href={href} className="store-pill border border-white/40 bg-white px-8 py-3 text-foreground">
            {label}
          </Link>
        </Magnetic>
      </div>
    </section>
  );
}
