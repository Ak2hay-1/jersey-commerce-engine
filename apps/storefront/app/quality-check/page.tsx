import type { Metadata } from 'next';
import Link from 'next/link';
import { DEFAULT_STOREFRONT_GUIDES } from '@jersey-commerce/types';
import { serverStoreOptions } from '../../lib/server-options';
import { cachedBootstrap, tenantKey } from '../../lib/cached-store';
import { Magnetic } from '../../components/motion/magnetic';
import { Reveal } from '../../components/motion/reveal';
import { SplitHeading } from '../../components/motion/split-heading';
import { pageShare } from '../../lib/page-meta';

export async function generateMetadata(): Promise<Metadata> {
  return pageShare({
    title: 'Quality Check',
    description: 'Compare Master, Player, Full Sleeves, and Retro jersey quality at Jerzyfy.',
    path: '/quality-check',
  });
}

export default async function QualityCheckPage(): Promise<React.JSX.Element> {
  let tiers = DEFAULT_STOREFRONT_GUIDES.qualityTiers;
  try {
    const options = await serverStoreOptions();
    const store = await cachedBootstrap(tenantKey(options));
    tiers = store.website.chrome?.guides?.qualityTiers?.length
      ? store.website.chrome.guides.qualityTiers
      : DEFAULT_STOREFRONT_GUIDES.qualityTiers;
  } catch {
    // Defaults still render offline.
  }

  return (
    <div className="mx-auto max-w-3xl store-gutter py-12 md:py-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Guides</p>
      <SplitHeading
        as="h1"
        text="Quality Check"
        className="mt-4 break-words font-heading text-[clamp(2rem,10vw,4.5rem)] uppercase leading-[0.9] md:text-7xl"
      />
      <Reveal className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
        <p>Know what you are buying — four jersey builds, from everyday Master to pitch-close Player quality.</p>
      </Reveal>

      <div className="mt-12 space-y-14 border-t border-foreground/10 pt-10">
        {tiers.map((tier, index) => (
          <Reveal key={tier.id || tier.title} className="space-y-4">
            <h2 className="font-heading text-2xl uppercase leading-tight md:text-3xl">
              {index + 1}) {tier.title}
            </h2>
            {tier.intro ? <p className="text-base leading-relaxed text-muted-foreground md:text-lg">{tier.intro}</p> : null}
            {tier.bullets.length ? (
              <ul className="space-y-2 text-sm leading-relaxed text-foreground md:text-base">
                {tier.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {tier.closing ? <p className="text-sm leading-relaxed text-muted-foreground md:text-base">{tier.closing}</p> : null}
          </Reveal>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <Magnetic className="inline-block">
          <Link href="/size-chart" className="store-pill border border-foreground/20 px-8 py-3">
            Size chart
          </Link>
        </Magnetic>
        <Magnetic className="inline-block">
          <Link href="/products" className="store-pill bg-foreground px-8 py-3 text-background">
            Shop jerseys
          </Link>
        </Magnetic>
      </div>
    </div>
  );
}
