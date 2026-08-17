import type { Metadata } from 'next';
import type { HomepageSection, StorefrontProductListItem } from '@jersey-commerce/types';
import { storeApi } from '../lib/api';
import { serverStoreOptions } from '../lib/server-options';
import {
  CtaSection,
  FeaturedCategories,
  FeaturedProducts,
  PromoBanner,
  TrustSection,
} from '../components/home/homepage-sections';
import { LuxuryLanding } from '../components/home/luxury-landing';
import { DEFAULT_STORE_CHROME } from '../lib/swatch';

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
    return { title: 'Store', description: 'Premium sportswear storefront.' };
  }
}

export default async function HomePage(): Promise<React.JSX.Element> {
  const options = await serverStoreOptions();
  const store = await storeApi.bootstrap(options);
  const currency = store.tenant.currency;
  const sections = store.website.homepage.sections.filter((section: HomepageSection) => section.enabled);
  const hero = sections.find((section: HomepageSection) => section.type === 'hero');
  const promo = sections.find((section: HomepageSection) => section.type === 'promo-banner');

  const [featured, catalog] = await Promise.all([
    storeApi.featured(options).catch(() => [] as StorefrontProductListItem[]),
    storeApi.products({ pageSize: 8 }, options).catch(() => null),
  ]);
  const products = featured.length ? featured : (catalog?.items ?? []);
  const sizes = catalog?.facets.sizes.length ? catalog.facets.sizes : DEFAULT_STORE_CHROME.sizes;
  const colours = catalog?.facets.colours.length ? catalog.facets.colours : DEFAULT_STORE_CHROME.colours;

  const rendered = await Promise.all(
    sections
      .filter((section: HomepageSection) => section.type !== 'hero')
      .map(async (section: HomepageSection) => {
        if (section.type === 'featured-categories') {
          const categories = section.categorySlugs?.length
            ? (await storeApi.categories(options)).filter((item) => section.categorySlugs?.includes(item.slug))
            : (await storeApi.categories(options)).filter((item) => !item.parentId).slice(0, 4);
          return <FeaturedCategories key={section.type} section={section} categories={categories} />;
        }
        if (section.type === 'featured-products') {
          const listed = section.productSlugs?.length
            ? (await storeApi.products({ pageSize: 12 }, options)).items.filter((item: StorefrontProductListItem) =>
                section.productSlugs?.includes(item.slug),
              )
            : products;
          return <FeaturedProducts key={section.type} section={section} products={listed} currency={currency} />;
        }
        if (section.type === 'promo-banner') {
          return <PromoBanner key={section.type} section={section} />;
        }
        if (section.type === 'best-sellers') {
          const best = await storeApi.bestSellers(options);
          return <FeaturedProducts key={`${section.type}`} section={section} products={best} currency={currency} />;
        }
        if (section.type === 'new-arrivals') {
          const newest = await storeApi.newest(options);
          return <FeaturedProducts key={section.type} section={section} products={newest} currency={currency} />;
        }
        if (section.type === 'trust') {
          return <TrustSection key={section.type} section={section} />;
        }
        if (section.type === 'cta') {
          return <CtaSection key={section.type} section={section} />;
        }
        return null;
      }),
  );

  return (
    <div>
      <LuxuryLanding
        hero={hero}
        promo={promo}
        products={products}
        tenantName={store.tenant.name}
        sizes={sizes}
        colours={colours}
      />
      {rendered}
    </div>
  );
}
