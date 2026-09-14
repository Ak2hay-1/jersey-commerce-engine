'use client';

import { useState } from 'react';
import type { HomepageSection, StorefrontProductListItem } from '@jersey-commerce/types';
import { ProductImage } from '../catalog/product-image';
import { DEMO_HERO_IMAGE, resolveDemoMediaUrl } from '../../lib/demo-media';
import { useStore } from '../providers/store-provider';

const HERO_VIDEO_SRC = '/media/hero-loop.mp4';

export function CinematicHero({
  section: sectionProp,
  fallbackImage,
}: {
  section?: HomepageSection;
  fallbackImage?: StorefrontProductListItem['primaryImage'];
}): React.JSX.Element {
  const store = useStore();
  const section =
    store.website.homepage.sections.find((item) => item.type === 'hero') ?? sectionProp;
  const [videoFailed, setVideoFailed] = useState(false);

  const poster =
    resolveDemoMediaUrl(section?.image) ||
    resolveDemoMediaUrl(section?.slides?.[0]?.image) ||
    resolveDemoMediaUrl(fallbackImage?.url) ||
    DEMO_HERO_IMAGE;

  return (
    <section
      className="home-pitch relative flex min-h-[85dvh] flex-col overflow-hidden bg-[hsl(var(--hero-plane))] text-foreground sm:min-h-[90dvh] lg:min-h-[92dvh]"
      aria-label="Homepage hero"
    >
      <div className="absolute inset-0">
        {!videoFailed ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={HERO_VIDEO_SRC}
            poster={poster}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden
            onError={() => setVideoFailed(true)}
          />
        ) : (
          <ProductImage
            src={poster}
            alt=""
            className="object-cover"
            sizes="100vw"
            priority
            fill
          />
        )}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_60%_20%,rgba(122,31,31,0.28),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/25" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-transparent" />
    </section>
  );
}
