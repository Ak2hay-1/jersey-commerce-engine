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
  LimitedEditionBand,
  PromoBanner,
  StatementSection,
  TrendingSection,
  TrustSection,
} from '../components/home/homepage-sections';
import { CinematicHero } from '../components/home/cinematic-hero';
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

function withCatalogCover(
  categories: Awaited<ReturnType<typeof cachedCategories>>,
  catalogItems: StorefrontProductListItem[],
): Awaited<ReturnType<typeof cachedCategories>> {
  return categories.map((category) => {
    if (category.image) {
      return category;
    }
    const cover = catalogItems.find((item) => item.category?.id === category.id || item.category?.slug === category.slug);
    return cover?.primaryImage?.url ? { ...category, image: cover.primaryImage.url } : category;
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
  const brand = store.tenant.name?.trim() || 'Jerzyfy';
  const products = featured.length ? featured : (catalog?.items ?? []);
  const catalogItems = catalog?.items ?? [];
  const categoriesWithCovers = withCatalogCover(categories, catalogItems);
  const configured = store.website.homepage.sections;
  const sections = configured.filter((section: HomepageSection) => section.enabled);
  const catalogRailsConfigured = configured.some(
    (section) =>
      section.type === 'featured-products' ||
      section.type === 'new-arrivals' ||
      section.type === 'best-sellers',
  );
  const sectionsWithCatalog =
    catalogRailsConfigured || products.length === 0
      ? sections
      : [
          ...sections,
          { type: 'featured-products' as const, enabled: true, heading: 'Featured kits' },
          { type: 'new-arrivals' as const, enabled: true, heading: 'Latest kits' },
        ];
  const orderedSections = [
    ...sectionsWithCatalog.filter((section) => section.type === 'hero'),
    ...sectionsWithCatalog.filter((section) => section.type !== 'hero' && section.type !== 'marquee'),
  ];

  const firstCollectionIndex = orderedSections.findIndex(
    (section) =>
      section.type === 'featured-products' ||
      section.type === 'best-sellers' ||
      section.type === 'new-arrivals',
  );

  const rendered: React.ReactNode[] = [];
  let injectedTrending = false;
  let injectedLimited = false;

  for (let index = 0; index < orderedSections.length; index += 1) {
    const section = orderedSections[index];
    if (!section) {
      continue;
    }
    const key = `${section.type}-${index}`;

    if (section.type === 'hero') {
      rendered.push(
        <CinematicHero
          key={key}
          section={section}
          fallbackImage={products[0]?.primaryImage}
          featuredProducts={products}
          currency={currency}
        />,
      );
      continue;
    }
    if (section.type === 'marquee') {
      continue;
    }
    if (section.type === 'statement') {
      rendered.push(<StatementSection key={key} section={section} />);
      continue;
    }
    if (section.type === 'featured-categories') {
      const listed = section.categorySlugs?.length
        ? categoriesWithCovers.filter((item) => section.categorySlugs?.includes(item.slug))
        : categoriesWithCovers.filter((item) => !item.parentId).slice(0, 3);
      rendered.push(<FeaturedCategories key={key} section={section} categories={listed} />);
      continue;
    }
    if (section.type === 'featured-products') {
      const picked = section.productSlugs?.length ? pickBySlugs(catalogItems, section.productSlugs) : [];
      const listed = picked.length ? picked : products;
      rendered.push(<FeaturedProducts key={key} section={section} products={listed} currency={currency} />);
      if (!injectedTrending) {
        rendered.push(<TrendingSection key="trending" categories={categoriesWithCovers} />);
        injectedTrending = true;
      }
      continue;
    }
    if (section.type === 'promo-banner') {
      rendered.push(<PromoBanner key={key} section={section} />);
      continue;
    }
    if (section.type === 'best-sellers') {
      const best = await storeApi.bestSellers(options);
      rendered.push(<FeaturedProducts key={key} section={section} products={best} currency={currency} />);
      if (!injectedTrending) {
        rendered.push(<TrendingSection key="trending" categories={categoriesWithCovers} />);
        injectedTrending = true;
      }
      continue;
    }
    if (section.type === 'new-arrivals') {
      const picked = section.productSlugs?.length ? pickBySlugs(catalogItems, section.productSlugs) : [];
      const newest = picked.length
        ? picked
        : await storeApi.newest(options).catch(() => catalogItems);
      const isOnlyProductRail = index === firstCollectionIndex;

      if (isOnlyProductRail && !injectedTrending) {
        rendered.push(
          <FeaturedProducts key={`${key}-collection`} section={section} products={newest} currency={currency} />,
        );
        rendered.push(<TrendingSection key="trending" categories={categoriesWithCovers} />);
        injectedTrending = true;
      }

      if (!injectedLimited) {
        rendered.push(
          <LimitedEditionBand key="limited" products={newest} brand={brand} currency={currency} />,
        );
        injectedLimited = true;
      }

      if (!isOnlyProductRail) {
        rendered.push(<LatestDrop key={key} section={section} products={newest} currency={currency} />);
      }
      continue;
    }
    if (section.type === 'trust') {
      rendered.push(<TrustSection key={key} section={section} />);
      continue;
    }
    if (section.type === 'cta') {
      rendered.push(<CtaSection key={key} section={section} />);
    }
  }

  const hasHero = orderedSections.some((section) => section.type === 'hero');
  const newestForLimited = catalogItems.length ? catalogItems : products;

  return (
    <div className="home-matchday">
      {hasHero ? null : (
        <CinematicHero
          fallbackImage={products[0]?.primaryImage}
          featuredProducts={products}
          currency={currency}
        />
      )}
      {rendered}
      {!injectedTrending ? <TrendingSection categories={categoriesWithCovers} /> : null}
      {!injectedLimited ? (
        <LimitedEditionBand products={newestForLimited} brand={brand} currency={currency} />
      ) : null}
    </div>
  );
}
