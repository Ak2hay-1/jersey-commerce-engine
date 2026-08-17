import Link from 'next/link';
import type { HomepageSection, StorefrontProductListItem } from '@jersey-commerce/types';
import { ArrowRight, Play } from 'lucide-react';
import { ProductImage } from '../catalog/product-image';
import { Magnetic } from '../motion/magnetic';
import { Reveal } from '../motion/reveal';
import { GlassCard } from './glass-card';

const FALLBACK_HEADING = 'YOUR NEW KIT IS HERE +';

export function LuxuryLanding({
  hero,
  promo,
  products,
  tenantName,
  sizes,
  colours,
}: {
  hero?: HomepageSection;
  promo?: HomepageSection;
  products: StorefrontProductListItem[];
  tenantName: string;
  sizes: string[];
  colours: string[];
}): React.JSX.Element {
  const featured = products[0];
  const thumbs = products.filter((item) => item.primaryImage?.url).slice(0, 4);
  const heading = hero?.heading?.trim() || FALLBACK_HEADING;
  const subheading =
    hero?.subheading ||
    'A limited drop cut for match day. Premium fabric, sharp prints, and an exclusive store offer on the full catalog.';
  const shopHref = hero?.ctaHref || (featured ? `/products/${featured.slug}` : '/products');
  const shopLabel = hero?.ctaLabel || 'Shop Now';
  const kicker = `+${sizes[0] ?? 'M'} ${(colours[0] ?? 'ORANGE').toUpperCase()}`;
  const skuLabel = `SHOP NEW ${featured?.slug?.replace(/-/g, ' ').toUpperCase() ?? 'DROP'}`;
  const promoTitle = promo?.heading || 'BLACK KIT / EXCLUSIVE';
  const promoLine = promo?.subheading || 'Get up to 40% off selected jerseys this week.';

  return (
    <section className="landing-wash relative overflow-hidden pb-10 pt-4 md:pb-16">
      <div className="mx-auto grid max-w-store items-start gap-8 px-4 lg:grid-cols-12 lg:gap-6">
        <div className="relative lg:col-span-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-b-[2.4rem] rounded-t-[1.4rem] shadow-luxury">
              <div className="hero-honeycomb relative aspect-[16/10] min-h-[18rem] md:min-h-[26rem]">
                {hero?.image || featured?.primaryImage?.url ? (
                  <ProductImage
                    src={hero?.image || featured?.primaryImage?.url}
                    alt={featured?.name ?? heading}
                    className="object-cover object-center"
                    sizes="(max-width: 1024px) 100vw, 70vw"
                    fill
                    priority
                  />
                ) : null}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/25 via-transparent to-black/10" />
              </div>

              <div className="absolute left-3 top-3 z-10 w-[min(100%,18rem)] sm:left-6 sm:top-6">
                <GlassCard className="p-4 sm:p-5">
                  <p className="text-[11px] font-semibold uppercase leading-relaxed tracking-[0.16em] text-foreground">
                    Your new
                    <br />
                    Perfect {tenantName}
                  </p>
                  <Link href={shopHref} className="store-pill mt-4 inline-flex border border-foreground/20 px-5 py-1.5 text-foreground">
                    Shop
                  </Link>
                  {thumbs.length > 0 ? (
                    <div className="mt-4 flex -space-x-2">
                      {thumbs.map((item) => (
                        <Link
                          key={item.id}
                          href={`/products/${item.slug}`}
                          className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-white"
                          aria-label={item.name}
                        >
                          <ProductImage
                            src={item.primaryImage?.url}
                            alt=""
                            className="h-full w-full object-cover"
                            sizes="36px"
                          />
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </GlassCard>
              </div>

              <div className="absolute bottom-16 right-3 z-10 w-[min(100%,16rem)] sm:bottom-20 sm:right-6">
                <GlassCard solid className="p-4">
                  <p className="text-sm font-extrabold uppercase leading-tight tracking-wide">{promoTitle}</p>
                  <p className="mt-2 text-[11px] uppercase leading-relaxed tracking-wide text-muted-foreground">{promoLine}</p>
                </GlassCard>
              </div>

              <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 sm:left-auto sm:right-1/3 sm:translate-x-0">
                <div className="flex -space-x-2">
                  {thumbs.slice(0, 3).map((item) => (
                    <span key={`avatar-${item.id}`} className="h-8 w-8 overflow-hidden rounded-full border-2 border-white bg-muted">
                      <ProductImage src={item.primaryImage?.url} alt="" className="h-full w-full object-cover" sizes="32px" />
                    </span>
                  ))}
                </div>
                {featured ? (
                  <Link
                    href={`/products/${featured.slug}`}
                    className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-foreground">
                      <Play className="h-3 w-3 fill-current" />
                    </span>
                    Take look + {featured.slug.slice(0, 10).toUpperCase()}
                  </Link>
                ) : null}
              </div>

              <div className="absolute bottom-4 left-4 z-10">
                <span className="store-pill bg-white/90 px-4 py-2 text-foreground shadow-card">01 | + 90k happy customer</span>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="flex flex-col justify-between lg:col-span-4 lg:min-h-[26rem] lg:pt-2">
          <Reveal delay={0.08}>
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
              <span className="h-4 w-4 rounded-full bg-[conic-gradient(from_90deg,#ea580c_0_50%,#fff_50%)] ring-1 ring-black/10" />
              {kicker}
            </p>
            <h1 className="mt-4 font-heading text-[clamp(2.4rem,5.4vw,4.6rem)] font-extrabold uppercase leading-[0.92] tracking-tight">
              {heading}
            </h1>
            <Link
              href={shopHref}
              className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground"
            >
              {skuLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Reveal>
          <Reveal delay={0.16} className="mt-8 lg:mt-auto">
            <p className="max-w-md text-[11px] uppercase leading-relaxed tracking-[0.12em] text-muted-foreground">{subheading}</p>
          </Reveal>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-store flex-wrap items-center gap-3 px-4">
        <Magnetic>
          <Link href={promo?.ctaHref || '/products'} className="store-pill border border-foreground/15 bg-transparent px-6 py-2.5 text-foreground">
            Learn More
          </Link>
        </Magnetic>
        <Magnetic>
          <Link href={shopHref} className="store-pill bg-foreground px-7 py-2.5 text-background">
            {shopLabel}
          </Link>
        </Magnetic>
      </div>
    </section>
  );
}
