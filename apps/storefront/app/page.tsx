import type { Metadata } from 'next';
import type { HomepageSection, StorefrontProductListItem } from '@jersey-commerce/types';
import { serverStoreOptions } from '../lib/server-options';
import {
  cachedBootstrap,
  cachedCategories,
  cachedFeatured,
  cachedProducts,
  productsQueryKey,
  tenantKey,
} from '../lib/cached-store';
import {
  CtaSection,
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
import { storeApi } from '../lib/api';

function pickBySlugs(items: StorefrontProductListItem[], slugs?: string[]): StorefrontProductListItem[] {
  if (!slugs?.length) {
    return items;
  }
  const bySlug = new Map(items.map((item) => [item.slug, item]));
  return slugs.flatMap((slug) => {
    const item = bySlug.get(slug);
    return item ? [item] : [];
  });
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const options = await serverStoreOptions();
    const store = await cachedBootstrap(tenantKey(options));
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
    return { title: 'Store', description: 'Football jerseys for club, national, kids, and custom kits.' };
  }
}

export default async function HomePage(): Promise<React.JSX.Element> {
  const options = await serverStoreOptions();
  const slug = tenantKey(options);
  const catalogKey = productsQueryKey({ pageSize: 24, sort: 'newest' });

  const [store, featured, catalog, categories] = await Promise.all([
    cachedBootstrap(slug),
    cachedFeatured(slug).catch(() => [] as StorefrontProductListItem[]),
    cachedProducts(slug, catalogKey).catch(() => null),
    cachedCategories(slug).catch(() => []),
  ]);

  const currency = store.tenant.currency;
  const sections = store.website.homepage.sections.filter((section: HomepageSection) => section.enabled);
  const products = featured.length ? featured : (catalog?.items ?? []);
  const catalogItems = catalog?.items ?? [];
  const street = categories.find((item) => item.slug === 'club-jerseys' || item.slug === 'football-jerseys');
  const pitch = categories.find((item) => item.slug === 'national-jerseys' || item.slug === 'custom-jerseys');

  const rendered = await Promise.all(
    sections.map(async (section: HomepageSection, index: number) => {
      const key = `${section.type}-${index}`;
      if (section.type === 'hero') {
        return <CinematicHero key={key} section={section} fallbackImage={products[0]?.primaryImage} />;
      }
      if (section.type === 'marquee') {
        return null;
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
        const picked = section.productSlugs?.length ? pickBySlugs(catalogItems, section.productSlugs) : [];
        const listed = picked.length ? picked : products;
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
        const picked = section.productSlugs?.length ? pickBySlugs(catalogItems, section.productSlugs) : [];
        const newest = picked.length
          ? picked
          : await storeApi.newest(options).catch(() => catalogItems);
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
