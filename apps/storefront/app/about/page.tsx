import type { Metadata } from 'next';
import Link from 'next/link';
import { serverTenantOptions } from '../../lib/server-options';
import { cachedBootstrap, tenantKey } from '../../lib/cached-store';
import { fallbackStore } from '../../lib/fallback-store';
import { Magnetic } from '../../components/motion/magnetic';
import { Reveal } from '../../components/motion/reveal';
import { SplitHeading } from '../../components/motion/split-heading';
import { pageShare } from '../../lib/page-meta';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const options = await serverTenantOptions();
    const store = await cachedBootstrap(tenantKey(options));
    return pageShare({
      title: store.website.footer.aboutTitle || 'About',
      description:
        store.website.footer.aboutBody?.slice(0, 160) ||
        `${store.tenant.name} — football jerseys for club, national, and custom kits.`,
      path: '/about',
    });
  } catch {
    return pageShare({
      title: 'About',
      description: 'Jerzyfy — football jerseys for club, national, and custom kits.',
      path: '/about',
    });
  }
}

export default async function AboutPage(): Promise<React.JSX.Element> {
  let name = fallbackStore.tenant.name;
  let aboutTitle = 'Wear the game.';
  let aboutBody = '';
  let materialsTitle = 'Materials';
  let materials: string[] = [];
  try {
    const options = await serverTenantOptions();
    const store = await cachedBootstrap(tenantKey(options));
    name = store.tenant.name;
    aboutTitle = store.website.footer.aboutTitle?.trim() || 'Wear the game.';
    aboutBody = store.website.footer.aboutBody?.trim() || '';
    materialsTitle = store.website.footer.materialsTitle?.trim() || 'Materials';
    materials = store.website.footer.materials?.filter(Boolean) ?? [];
  } catch {
    // Fallback copy still works offline.
  }

  const paragraphs = aboutBody
    ? aboutBody.split(/\n+/).map((part) => part.trim()).filter(Boolean)
    : [
        `Welcome to ${name}. We sell football jerseys only — club kits, national colours, and blank customs ready for name and number.`,
        'Every jersey is cut for match day and everyday wear: breathable knits, durable prints, and silhouettes that sit between the stands and the street.',
        'Replica-inspired kits. Fan-first fit. Built to wear hard beyond the final whistle.',
      ];

  return (
    <div className="mx-auto max-w-3xl store-gutter py-12 md:py-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">About</p>
      <SplitHeading
        as="h1"
        text={aboutTitle}
        className="mt-4 break-words font-heading text-[clamp(2rem,10vw,4.5rem)] uppercase leading-[0.9] md:text-7xl"
      />
      <Reveal className="mt-10 space-y-6 text-base leading-relaxed text-muted-foreground md:text-lg">
        {paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 48)}>{paragraph}</p>
        ))}
      </Reveal>
      <div className="mt-12 grid gap-10 border-t border-foreground/10 pt-10 md:grid-cols-2">
        <div>
          <h2 className="font-heading text-2xl uppercase">{materialsTitle}</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-muted-foreground">
            {(materials.length
              ? materials
              : [
                  'Breathable performance knits for replica-inspired football jerseys.',
                  'Durable crests and prints built for repeated washes.',
                  'Athletic fits for match day and everyday wear.',
                  'Blank bases ready for custom name and number printing.',
                ]
            ).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </div>
        <div>
          <h2 className="font-heading text-2xl uppercase">The kit</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Club, national, and custom — one catalog focused on football jerseys so every drop stays sharp.
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
