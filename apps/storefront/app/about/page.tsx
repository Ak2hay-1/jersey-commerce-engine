import type { Metadata } from 'next';
import Link from 'next/link';
import { serverStoreOptions } from '../../lib/server-options';
import { cachedBootstrap, tenantKey } from '../../lib/cached-store';
import { fallbackStore } from '../../lib/fallback-store';
import { Magnetic } from '../../components/motion/magnetic';
import { Reveal } from '../../components/motion/reveal';
import { SplitHeading } from '../../components/motion/split-heading';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const options = await serverStoreOptions();
    const store = await cachedBootstrap(tenantKey(options));
    return {
      title: 'About',
      description: `${store.tenant.name} — football jerseys for club, national, kids, and custom kits.`,
      alternates: { canonical: '/about' },
    };
  } catch {
    return { title: 'About' };
  }
}

export default async function AboutPage(): Promise<React.JSX.Element> {
  let name = fallbackStore.tenant.name;
  try {
    const options = await serverStoreOptions();
    const store = await cachedBootstrap(tenantKey(options));
    name = store.tenant.name;
  } catch {
    // Fallback copy still works offline.
  }

  return (
    <div className="mx-auto max-w-3xl store-gutter py-12 md:py-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">About</p>
      <SplitHeading as="h1" text="Wear the game." className="mt-4 break-words font-heading text-[clamp(2rem,10vw,4.5rem)] uppercase leading-[0.9] md:text-7xl" />
      <Reveal className="mt-10 space-y-6 text-base leading-relaxed text-muted-foreground md:text-lg">
        <p>
          Welcome to {name}. We sell football jerseys only — club kits, national colours, kids sizes, and blank customs
          ready for name and number.
        </p>
        <p>
          Every jersey is cut for match day and everyday wear: breathable knits, durable prints, and silhouettes that
          sit between the stands and the street.
        </p>
        <p>Replica-inspired kits. Fan-first fit. Built to wear hard beyond the final whistle.</p>
      </Reveal>
      <div className="mt-12 grid gap-10 border-t border-foreground/10 pt-10 md:grid-cols-2">
        <div>
          <h2 className="font-heading text-2xl uppercase">Materials</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-muted-foreground">
            <li>Breathable performance knits for replica-inspired football jerseys.</li>
            <li>Durable crests and prints built for repeated washes.</li>
            <li>Youth-friendly fits for kids match-day kits.</li>
            <li>Blank bases ready for custom name and number printing.</li>
          </ol>
        </div>
        <div>
          <h2 className="font-heading text-2xl uppercase">The kit</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Club, national, kids, and custom — one catalog focused on football jerseys so every drop stays sharp.
          </p>
        </div>
      </div>
      <Magnetic className="mt-12 inline-block">
        <Link href="/products" className="store-pill bg-foreground px-8 py-3 text-background">
          Shop jerseys
        </Link>
      </Magnetic>
    </div>
  );
}
