import type { Metadata } from 'next';
import type { HomepageSection, StorefrontProductListItem } from '@jersey-commerce/types';
import { storeApi } from '../lib/api';
import { serverStoreOptions } from '../lib/server-options';
import {
  CtaSection,
  DualMarquee,
  FeaturedCategories,
  FeaturedProducts,
  LatestDrop,
  PromoBanner,
  StatementSection,
  TrustSection,
} from '../components/home/homepage-sections';
import { CinematicHero } from '../components/home/cinematic-hero';
import { CoverflowStage } from '../components/home/coverflow-stage';
import { LookbookStrip } from '../components/home/lookbook-strip';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const options = await serverStoreOptions();
    const store = await storeApi.bootstrap(options);
    return {
      title: store.website.seoTitle || store.tenant.name,
      description: store.website.seoDescription || undefined,
      alternates: { canonical: '/' },
      openGraph: {
        title: store.website.seoTitle || store.tenant.name,
        description: store.website.seoDescription || undefined,
      },
    };
  } catch {
    return { title: 'Store', description: 'Premium streetwear and match kits.' };
  }
}

export default async function HomePage(): Promise<React.JSX.Element> {
  const options = await serverStoreOptions();
  const store = await storeApi.bootstrap(options);
  const currency = store.tenant.currency;
  const sections = store.website.homepage.sections.filter((section: HomepageSection) => section.enabled);

  const [featured, catalog, categories] = await Promise.all([
    storeApi.featured(options).catch(() => [] as StorefrontProductListItem[]),
    storeApi.products({ pageSize: 8, sort: 'newest' }, options).catch(() => null),
    storeApi.categories(options).catch(() => []),
  ]);
  const products = featured.length ? featured : (catalog?.items ?? []);
  const street = categories.find((item) => item.slug === 'oversized-tees' || item.slug === 'streetwear');
  const pitch = categories.find((item) => item.slug === 'football' || item.slug === 'club-jerseys');

  const rendered = await Promise.all(
    sections.map(async (section: HomepageSection, index: number) => {
      const key = `${section.type}-${index}`;
      if (section.type === 'hero') {
        return <CinematicHero key={key} section={section} fallbackImage={products[0]?.primaryImage} />;
      }
      if (section.type === 'marquee') {
        return (
          <DualMarquee
            key={key}
            heading={section.heading || store.tenant.name}
            subheading={section.subheading}
            inverted={section.ctaLabel === 'dark'}
          />
        );
      }
      if (section.type === 'statement') {
        return <StatementSection key={key} section={section} />;
      }
      if (section.type === 'featured-categories') {
        const listed = section.categorySlugs?.length
          ? categories.filter((item) => section.categorySlugs?.includes(item.slug))
          : categories.filter((item) => !item.parentId).slice(0, 3);
        return <FeaturedCategories key={key} section={section} categories={listed} />;
      }
      if (section.type === 'featured-products') {
        const listed = section.productSlugs?.length
          ? (await storeApi.products({ pageSize: 12 }, options)).items.filter((item: StorefrontProductListItem) =>
              section.productSlugs?.includes(item.slug),
            )
          : products;
        return <CoverflowStage key={key} products={listed} currency={currency} heading={section.heading} />;
      }
      if (section.type === 'promo-banner') {
        return <PromoBanner key={key} section={section} />;
      }
      if (section.type === 'best-sellers') {
        const best = await storeApi.bestSellers(options);
        return <FeaturedProducts key={key} section={section} products={best} currency={currency} />;
      }
      if (section.type === 'new-arrivals') {
        const newest = await storeApi.newest(options).catch(() => catalog?.items ?? []);
        return <LatestDrop key={key} section={section} products={newest} currency={currency} />;
      }
      if (section.type === 'trust') {
        return <TrustSection key={key} section={section} />;
      }
      if (section.type === 'cta') {
        return <CtaSection key={key} section={section} />;
      }
      return null;
    }),
  );

  const hasHero = sections.some((section) => section.type === 'hero');

  return (
    <div>
      {hasHero ? null : <CinematicHero fallbackImage={products[0]?.primaryImage} />}
      {rendered}
      <LookbookStrip street={street} pitch={pitch} />
    </div>
  );
}
