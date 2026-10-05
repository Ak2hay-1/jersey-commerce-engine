import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@jersey-commerce/ui';
import { ProductImage } from '../catalog/product-image';
import { Reveal } from '../motion/reveal';

export function EditorialBanner({
  kicker,
  heading,
  subheading,
  ctaLabel,
  ctaHref,
  image,
  imageAlt,
  reverse = false,
}: {
  kicker?: string;
  heading: string;
  subheading?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  image?: string | null;
  imageAlt?: string;
  reverse?: boolean;
}): React.JSX.Element {
  return (
    <section className="py-[calc(var(--space-section)*0.6)]">
      <div className="mx-auto max-w-store store-gutter">
        <Reveal>
          <div className="panel relative grid overflow-hidden md:grid-cols-2">
            <div
              className="pointer-events-none absolute -bottom-1/3 left-1/4 h-[120%] w-[70%] rounded-full bg-[hsl(var(--accent)/0.16)] blur-[120px]"
              aria-hidden
            />
            <div className={cn('relative aspect-[4/3] md:aspect-auto md:min-h-[28rem]', reverse && 'md:order-2')}>
              <ProductImage
                src={image}
                alt={imageAlt ?? heading}
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                fill
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--surface-1))] via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-[hsl(var(--surface-1)/0.4)]" />
            </div>
            <div className="relative flex flex-col justify-center gap-5 p-6 sm:p-10 lg:p-14">
              {kicker ? <p className="section-kicker">{kicker}</p> : null}
              <h2 className="font-display text-[clamp(2.25rem,5vw,4rem)]">{heading}</h2>
              {subheading ? (
                <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground sm:text-base">{subheading}</p>
              ) : null}
              {ctaLabel && ctaHref ? (
                <div className="pt-2">
                  <Link href={ctaHref} className="btn btn-lg btn-accent cursor-pointer">
                    {ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
