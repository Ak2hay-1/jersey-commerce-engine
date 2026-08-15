import type { Metadata } from 'next';
import { storeApi } from '../lib/api';
import { serverStoreOptions } from '../lib/server-options';
import {
  CtaSection,
  FeaturedCategories,
  FeaturedProducts,
  HeroSection,
  PromoBanner,
  TrustSection,
} from '../components/home/homepage-sections';

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
  const sections = store.website.homepage.sections.filter((section) => section.enabled);

  const rendered = await Promise.all(
    sections.map(async (section) => {
      if (section.type === 'hero') {
        return <HeroSection key={section.type + (section.heading ?? '')} section={section} />;
      }
      if (section.type === 'featured-categories') {
        const categories = section.categorySlugs?.length
          ? (await storeApi.categories(options)).filter((item) => section.categorySlugs?.includes(item.slug))
          : (await storeApi.categories(options)).filter((item) => !item.parentId).slice(0, 4);
        return <FeaturedCategories key={section.type} section={section} categories={categories} />;
      }
      if (section.type === 'featured-products') {
        const products = section.productSlugs?.length
          ? (await storeApi.products({ pageSize: 12 }, options)).items.filter((item) => section.productSlugs?.includes(item.slug))
          : await storeApi.featured(options);
        return <FeaturedProducts key={section.type} section={section} products={products} currency={currency} />;
      }
      if (section.type === 'promo-banner') {
        return <PromoBanner key={section.type} section={section} />;
      }
      if (section.type === 'best-sellers') {
        const products = await storeApi.bestSellers(options);
        return <FeaturedProducts key={section.type} section={section} products={products} currency={currency} />;
      }
      if (section.type === 'new-arrivals') {
        const products = await storeApi.newest(options);
        return <FeaturedProducts key={section.type} section={section} products={products} currency={currency} />;
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

  return <div>{rendered}</div>;
}
