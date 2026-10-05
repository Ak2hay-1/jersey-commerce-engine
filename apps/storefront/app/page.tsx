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
  EditorialBanner,
  FeaturedCategories,
  FeaturedProducts,
  LatestDrop,
  PromoBanner,
  TrustSection,
} from '../components/home/homepage-sections';
import { CinematicHero } from '../components/home/cinematic-hero';
import { storeApi } from '../lib/api';

const PRODUCT_SECTIONS: ReadonlyArray<HomepageSection['type']> = ['featured-products', 'best-sellers', 'new-arrivals'];

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
  const products = featured.length ? featured : (catalog?.items ?? []);
  const catalogItems = catalog?.items ?? [];
  const imagePool = catalogItems.length ? catalogItems : products;
  const categoriesWithCovers = withCatalogCover(categories, catalogItems);

  const enabled = store.website.homepage.sections.filter(
    (section: HomepageSection) => section.enabled && section.type !== 'marquee',
  );
  const hasProductSection = enabled.some((section) => PRODUCT_SECTIONS.includes(section.type));
  const withDefaults: HomepageSection[] =
    hasProductSection || products.length === 0
      ? enabled
      : [
          ...enabled,
          { type: 'featured-products', enabled: true, heading: 'Featured kits' },
          { type: 'new-arrivals', enabled: true, heading: 'Latest drops' },
        ];
  const hero = withDefaults.find((section) => section.type === 'hero');
  const body = withDefaults.filter((section) => section.type !== 'hero');

  if (!body.some((section) => section.type === 'featured-categories') && categoriesWithCovers.length > 0) {
    body.unshift({ type: 'featured-categories', enabled: true, heading: 'Shop by kit' });
  }

  const hasEditorial = body.some((section) => section.type === 'promo-banner' || section.type === 'statement');
  const rendered: React.ReactNode[] = [];
  let editorialCount = 0;
  let injectedEditorial = hasEditorial;

  function editorialImage(): StorefrontProductListItem | undefined {
    const pick = imagePool[(editorialCount * 3 + 2) % Math.max(imagePool.length, 1)];
    editorialCount += 1;
    return pick;
  }

  for (let index = 0; index < body.length; index += 1) {
    const section = body[index];
    if (!section) {
      continue;
    }
    const key = `${section.type}-${index}`;

    if (section.type === 'statement' || section.type === 'promo-banner') {
      const cover = editorialImage();
      rendered.push(
        <PromoBanner
          key={key}
          section={section}
          kicker={section.type === 'statement' ? 'Match day' : 'Premium'}
          image={cover?.primaryImage?.url}
          imageAlt={cover?.primaryImage?.altText ?? cover?.name}
          reverse={editorialCount % 2 === 0}
        />,
      );
      continue;
    }
    if (section.type === 'featured-categories') {
      const listed = section.categorySlugs?.length
        ? categoriesWithCovers.filter((item) => section.categorySlugs?.includes(item.slug))
        : categoriesWithCovers.filter((item) => !item.parentId);
      rendered.push(<FeaturedCategories key={key} section={section} categories={listed} />);
      continue;
    }
    if (section.type === 'featured-products') {
      const picked = section.productSlugs?.length ? pickBySlugs(catalogItems, section.productSlugs) : [];
      rendered.push(
        <FeaturedProducts key={key} section={section} products={picked.length ? picked : products} currency={currency} />,
      );
    } else if (section.type === 'best-sellers') {
      const best = await storeApi.bestSellers(options).catch(() => products);
      rendered.push(<FeaturedProducts key={key} section={section} products={best} currency={currency} />);
    } else if (section.type === 'new-arrivals') {
      const picked = section.productSlugs?.length ? pickBySlugs(catalogItems, section.productSlugs) : [];
      const newest = picked.length ? picked : await storeApi.newest(options).catch(() => catalogItems);
      rendered.push(<LatestDrop key={key} section={section} products={newest} currency={currency} />);
    } else if (section.type === 'trust') {
      rendered.push(<TrustSection key={key} section={section} />);
      continue;
    } else if (section.type === 'cta') {
      rendered.push(<CtaSection key={key} section={section} />);
      continue;
    } else {
      continue;
    }

    if (!injectedEditorial && imagePool.length > 0) {
      const cover = editorialImage();
      rendered.push(
        <EditorialBanner
          key="editorial-default"
          kicker="Limited edition"
          heading="Master versions"
          subheading="Player-spec fabrics, heat-pressed crests and a match-day cut. The kits the pros wear, built for the stands."
          ctaLabel="Shop master versions"
          ctaHref="/products?search=master"
          image={cover?.primaryImage?.url}
          imageAlt={cover?.primaryImage?.altText ?? cover?.name}
        />,
      );
      injectedEditorial = true;
    }
  }

  return (
    <div className="home-matchday">
      <CinematicHero
        section={hero}
        fallbackImage={products[0]?.primaryImage}
        products={products.slice(0, 5)}
        currency={currency}
      />
      {rendered}
    </div>
  );
}
