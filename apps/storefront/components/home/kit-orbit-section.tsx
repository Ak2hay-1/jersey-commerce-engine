'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import type { StorefrontProductListItem } from '@jersey-commerce/types';
import { ScrollHeading } from '../motion/scroll-heading';
import { Reveal } from '../motion/reveal';
import { resolveDemoMediaUrl } from '../../lib/demo-media';

const FloatingKits = dynamic(() => import('../motion/floating-kits').then((mod) => mod.FloatingKits), {
  ssr: false,
  loading: () => <div className="h-[28rem] md:h-[34rem]" />,
});

export function KitOrbitSection({ products }: { products: StorefrontProductListItem[] }): React.JSX.Element | null {
  const textured = useMemo(
    () =>
      products.flatMap((product) => {
        const url = resolveDemoMediaUrl(product.primaryImage?.url);
        return url && product.primaryImage ? [{ ...product, primaryImage: { ...product.primaryImage, url } }] : [];
      }),
    [products],
  );

  if (textured.length < 3) {
    return null;
  }

  return (
    <section className="relative overflow-hidden py-[var(--space-section)]" aria-label="Kit orbit">
      <div className="mx-auto max-w-store store-gutter">
        <ScrollHeading kicker="The rotation">Kits in orbit</ScrollHeading>
        <Reveal>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">Tap any kit to jump straight to it.</p>
        </Reveal>
      </div>
      <div className="relative mt-6">
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto h-40 max-w-3xl -translate-y-1/2 rounded-[100%] bg-[radial-gradient(ellipse,hsl(var(--accent)/0.22)_0%,transparent_70%)] blur-2xl"
          aria-hidden
        />
        <FloatingKits products={textured} />
      </div>
    </section>
  );
}
