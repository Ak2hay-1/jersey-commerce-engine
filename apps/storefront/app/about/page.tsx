import type { Metadata } from 'next';
import Link from 'next/link';
import { storeApi } from '../../lib/api';
import { serverStoreOptions } from '../../lib/server-options';
import { fallbackStore } from '../../lib/fallback-store';
import { Magnetic } from '../../components/motion/magnetic';
import { Reveal } from '../../components/motion/reveal';
import { SplitHeading } from '../../components/motion/split-heading';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const store = await storeApi.bootstrap(await serverStoreOptions());
    return {
      title: 'About',
      description: `${store.tenant.name} — premium streetwear and match kits.`,
      alternates: { canonical: '/about' },
    };
  } catch {
    return { title: 'About' };
  }
}

export default async function AboutPage(): Promise<React.JSX.Element> {
  let name = fallbackStore.tenant.name;
  try {
    const store = await storeApi.bootstrap(await serverStoreOptions());
    name = store.tenant.name;
  } catch {
    // Fallback copy still works offline.
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:py-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">About</p>
      <SplitHeading as="h1" text="Stop fitting in." className="mt-4 font-heading text-5xl uppercase leading-[0.9] md:text-7xl" />
      <Reveal className="mt-10 space-y-6 text-base leading-relaxed text-muted-foreground md:text-lg">
        <p>
          Welcome to {name}. We build two worlds on one rack: oversized streetwear for everyday, and match kits for the
          days that matter.
        </p>
        <p>
          The label started from a simple idea — streetwear should not trade quality for attitude, and a jersey should
          feel as considered as a drop tee. Every piece is cut with intention: heavier GSM where it counts, prints that
          last, and silhouettes that sit between the stands and the street.
        </p>
        <p>This is the platform where quality meets identity. Not for everyone. Exactly for you.</p>
      </Reveal>
      <div className="mt-12 grid gap-10 border-t border-foreground/10 pt-10 md:grid-cols-2">
        <div>
          <h2 className="font-heading text-2xl uppercase">Materials</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-muted-foreground">
            <li>Heavyweight cotton and French terry for oversized tees.</li>
            <li>Breathable athletic knits for replica-inspired kits.</li>
            <li>Low-impact dyes and non-toxic prints wherever possible.</li>
            <li>Pieces designed to be worn hard and kept longer.</li>
          </ol>
        </div>
        <div>
          <h2 className="font-heading text-2xl uppercase">The drop</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Limited runs. No restock theatre. When a colourway is gone, it is gone — so the next drop can move forward.
          </p>
        </div>
      </div>
      <Magnetic className="mt-12 inline-block">
        <Link href="/products" className="store-pill bg-foreground px-8 py-3 text-background">
          Shop the catalog
        </Link>
      </Magnetic>
    </div>
  );
}
