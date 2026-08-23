import type {
  CategorySummary,
  HomepageBannerSlide,
  HomepageConfig,
  HomepageSection,
  StorefrontAvailability,
  StorefrontBootstrap,
  StorefrontCatalogFacets,
  StorefrontCustomer,
  StorefrontFooter,
  StorefrontProductDetail,
  StorefrontProductListItem,
  StorefrontTheme,
  StorefrontVariant,
  StorefrontWebsiteSettings,
  StorefrontAuthMethods,
  StorefrontPaymentMethods,
} from '@jersey-commerce/types';
import { DEFAULT_STOREFRONT_FOOTER, HOMEPAGE_SECTION_TYPES } from '@jersey-commerce/types';
import { availableQuantity } from '../inventory/inventory-math';
import { toCategorySummary, toImageDto } from '../catalog/catalog.mapper';
import { moneyString } from '../catalog/money';

export const STOREFRONT_LOW_STOCK_THRESHOLD = 5;

const DEFAULT_THEME: StorefrontTheme = {
  primaryColor: '#111111',
  secondaryColor: '#8A8178',
  accentColor: '#7A1F1F',
  backgroundColor: '#F4F1EC',
  foregroundColor: '#111111',
  headingFont: 'Instrument Serif',
  bodyFont: 'Inter',
  logo: null,
  favicon: null,
};

type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  sortOrder: number;
};

type ImageRecord = {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

type VariantRecord = {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  sellingPrice: { toFixed: (digits: number) => string };
  compareAtPrice: { toFixed: (digits: number) => string } | null;
  status: 'ACTIVE' | 'INACTIVE';
  inventory?: { quantity: number; reservedQuantity: number } | null;
};

type FacetVariant = Pick<VariantRecord, 'size' | 'color' | 'sellingPrice'>;

export function storefrontAvailability(available: number): {
  availability: StorefrontAvailability;
  remaining: number | null;
} {
  if (available <= 0) {
    return { availability: 'OUT_OF_STOCK', remaining: null };
  }
  if (available <= STOREFRONT_LOW_STOCK_THRESHOLD) {
    return { availability: 'LOW_STOCK', remaining: available };
  }
  return { availability: 'IN_STOCK', remaining: null };
}

function variantAvailable(variant: VariantRecord): number {
  if (variant.status !== 'ACTIVE') {
    return 0;
  }
  return availableQuantity(variant.inventory?.quantity ?? 0, variant.inventory?.reservedQuantity ?? 0);
}

function productAvailability(variants: VariantRecord[]): StorefrontAvailability {
  const levels = variants.map((variant) => storefrontAvailability(variantAvailable(variant)).availability);
  if (levels.includes('IN_STOCK')) {
    return 'IN_STOCK';
  }
  if (levels.includes('LOW_STOCK')) {
    return 'LOW_STOCK';
  }
  return 'OUT_OF_STOCK';
}

export function toStorefrontListItem(product: {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: CategoryRecord | null;
  images: ImageRecord[];
  variants: VariantRecord[];
}): StorefrontProductListItem {
  const active = product.variants.filter((variant) => variant.status === 'ACTIVE');
  const priced = [...active].sort((a, b) => a.sellingPrice.toFixed(2).localeCompare(b.sellingPrice.toFixed(2), 'en'));
  const lowest = priced[0];
  const highest = priced[priced.length - 1];
  const primary = product.images.find((image) => image.isPrimary) ?? product.images[0] ?? null;
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    status: product.status,
    featured: product.featured,
    category: product.category ? toCategorySummary(product.category) : null,
    primaryImage: primary ? toImageDto(primary) : null,
    lowestPrice: lowest ? lowest.sellingPrice.toFixed(2) : null,
    highestPrice: highest ? highest.sellingPrice.toFixed(2) : null,
    compareAtPrice: lowest?.compareAtPrice ? lowest.compareAtPrice.toFixed(2) : null,
    variantCount: active.length,
    availability: productAvailability(active),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function toStorefrontVariant(variant: VariantRecord): StorefrontVariant {
  const available = variantAvailable(variant);
  const stock = storefrontAvailability(available);
  return {
    id: variant.id,
    sku: variant.sku,
    size: variant.size,
    colour: variant.color,
    sellingPrice: variant.sellingPrice.toFixed(2),
    compareAtPrice: variant.compareAtPrice ? variant.compareAtPrice.toFixed(2) : null,
    availability: variant.status === 'ACTIVE' ? stock.availability : 'OUT_OF_STOCK',
    remaining: variant.status === 'ACTIVE' ? stock.remaining : null,
  };
}

export function toStorefrontProductDetail(
  product: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    shortDescription: string | null;
    brand: string | null;
    featured: boolean;
    seoTitle: string | null;
    seoDescription: string | null;
    createdAt: Date;
    updatedAt: Date;
    category: CategoryRecord | null;
    images: ImageRecord[];
    variants: VariantRecord[];
  },
  related: StorefrontProductListItem[],
): StorefrontProductDetail {
  const active = product.variants.filter((variant) => variant.status === 'ACTIVE');
  const sizes = [...new Set(active.map((variant) => variant.size).filter((value): value is string => Boolean(value)))];
  const colours = [...new Set(active.map((variant) => variant.color).filter((value): value is string => Boolean(value)))];
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    shortDescription: product.shortDescription,
    brand: product.brand,
    featured: product.featured,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    category: product.category ? toCategorySummary(product.category) : null,
    images: [...product.images]
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder)
      .map(toImageDto),
    variants: active.map(toStorefrontVariant),
    sizes,
    colours,
    related,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function emptyFacets(): StorefrontCatalogFacets {
  return { sizes: [], colours: [], brands: [], minPrice: null, maxPrice: null };
}

export function toFacets(variants: FacetVariant[], brands: Array<string | null>): StorefrontCatalogFacets {
  const sizes = [...new Set(variants.map((variant) => variant.size).filter((value): value is string => Boolean(value)))].sort();
  const colours = [...new Set(variants.map((variant) => variant.color).filter((value): value is string => Boolean(value)))].sort();
  const uniqueBrands = [...new Set(brands.filter((value): value is string => Boolean(value)))].sort();
  const prices = variants.map((variant) => variant.sellingPrice.toFixed(2)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  return {
    sizes,
    colours,
    brands: uniqueBrands,
    minPrice: prices[0] ?? null,
    maxPrice: prices[prices.length - 1] ?? null,
  };
}

export function toStorefrontCustomer(customer: {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
}): StorefrontCustomer {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    postalCode: customer.postalCode,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function parseSlides(value: unknown): HomepageBannerSlide[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const slides = value.flatMap((item) => {
    if (typeof item !== 'object' || item === null) {
      return [];
    }
    const slide = item as HomepageBannerSlide;
    if (typeof slide.image !== 'string' || !slide.image.trim()) {
      return [];
    }
    return [
      {
        id: typeof slide.id === 'string' ? slide.id : undefined,
        image: slide.image.trim(),
        heading: slide.heading,
        subheading: slide.subheading,
        ctaLabel: slide.ctaLabel,
        ctaHref: slide.ctaHref,
      },
    ];
  });
  return slides.length ? slides : undefined;
}

function parseStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const items = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return items.length ? items : undefined;
}

function parseSections(value: unknown): HomepageSection[] {
  const record = asRecord(value);
  const raw = Array.isArray(value) ? value : record.sections;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.flatMap((item) => {
    if (typeof item !== 'object' || item === null) {
      return [];
    }
    const section = item as HomepageSection;
    if (!HOMEPAGE_SECTION_TYPES.includes(section.type) || section.enabled === false) {
      if (!HOMEPAGE_SECTION_TYPES.includes(section.type)) {
        return [];
      }
    }
    return [
      {
        type: section.type,
        enabled: section.enabled !== false,
        heading: section.heading,
        subheading: section.subheading,
        image: section.image,
        ctaLabel: section.ctaLabel,
        ctaHref: section.ctaHref,
        categorySlugs: parseStringList(section.categorySlugs),
        productSlugs: parseStringList(section.productSlugs),
        items: section.items,
        slides: parseSlides(section.slides),
      },
    ];
  });
}

export function defaultHomepageConfig(): HomepageConfig {
  return {
    sections: [
      {
        type: 'hero',
        enabled: true,
        heading: 'New collection launched',
        subheading: 'Streetwear cut for the stands. Kits cut for the street.',
        ctaLabel: 'Shop the drop',
        ctaHref: '/products',
      },
      {
        type: 'statement',
        enabled: true,
        heading: 'THE TREND IS IN U',
        subheading: 'Cut for the stands. Lived on the street.',
      },
      { type: 'new-arrivals', enabled: true, heading: 'Latest drop' },
      {
        type: 'promo-banner',
        enabled: true,
        heading: 'Premium',
        subheading: 'Experience unparalleled quality and timeless design. Each piece is crafted to elevate everyday style.',
      },
      { type: 'featured-products', enabled: true, heading: 'Featured products' },
      { type: 'featured-categories', enabled: true, heading: 'Premium collection' },
      {
        type: 'trust',
        enabled: true,
        heading: 'Why shop with us',
        items: [
          { title: 'Free delivery', description: 'Complimentary delivery on orders above ₹2,000.' },
          { title: 'Secure checkout', description: 'Pay safely online with Razorpay.' },
          { title: 'Quality fabrics', description: 'GSM-first fabrics and durable prints.' },
          { title: 'Easy returns', description: 'Contact the store if a piece does not fit as expected.' },
        ],
      },
      {
        type: 'cta',
        enabled: true,
        heading: 'Find your drop',
        subheading: 'Browse oversized tees, match kits, and custom pieces.',
        ctaLabel: 'Browse the catalog',
        ctaHref: '/products',
      },
    ],
  };
}

export function toHomepageConfig(value: unknown): HomepageConfig {
  const sections = parseSections(value);
  if (sections.length === 0) {
    return defaultHomepageConfig();
  }
  return { sections };
}

function asString(value: unknown, fallback: string, max = 800): string {
  if (typeof value !== 'string') {
    return fallback;
  }
  return value.trim().slice(0, max) || fallback;
}

export function toFooterConfig(value: unknown): StorefrontFooter {
  const record = asRecord(value);
  const materials = parseStringList(record.materials) ?? DEFAULT_STOREFRONT_FOOTER.materials;
  return {
    kicker: asString(record.kicker, DEFAULT_STOREFRONT_FOOTER.kicker, 80),
    heading: asString(record.heading, DEFAULT_STOREFRONT_FOOTER.heading, 240),
    body: typeof record.body === 'string' ? record.body.trim().slice(0, 800) : DEFAULT_STOREFRONT_FOOTER.body,
    aboutTitle: asString(record.aboutTitle, DEFAULT_STOREFRONT_FOOTER.aboutTitle, 80),
    aboutBody: typeof record.aboutBody === 'string' ? record.aboutBody.trim().slice(0, 2000) : DEFAULT_STOREFRONT_FOOTER.aboutBody,
    materialsTitle: asString(record.materialsTitle, DEFAULT_STOREFRONT_FOOTER.materialsTitle, 80),
    materials: materials.slice(0, 12),
    showCollections: record.showCollections === false ? false : true,
    collectionsTitle: asString(record.collectionsTitle, DEFAULT_STOREFRONT_FOOTER.collectionsTitle, 80),
    shopTitle: asString(record.shopTitle, DEFAULT_STOREFRONT_FOOTER.shopTitle, 80),
    contactTitle: asString(record.contactTitle, DEFAULT_STOREFRONT_FOOTER.contactTitle, 80),
    copyright: typeof record.copyright === 'string' ? record.copyright.trim().slice(0, 240) : DEFAULT_STOREFRONT_FOOTER.copyright,
  };
}

export function mergeTheme(input: {
  logo?: string | null;
  favicon?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  foregroundColor?: string | null;
  headingFont?: string | null;
  bodyFont?: string | null;
}): StorefrontTheme {
  return {
    primaryColor: input.primaryColor || DEFAULT_THEME.primaryColor,
    secondaryColor: input.secondaryColor || DEFAULT_THEME.secondaryColor,
    accentColor: input.accentColor || DEFAULT_THEME.accentColor,
    backgroundColor: input.backgroundColor || DEFAULT_THEME.backgroundColor,
    foregroundColor: input.foregroundColor || DEFAULT_THEME.foregroundColor,
    headingFont: input.headingFont || DEFAULT_THEME.headingFont,
    bodyFont: input.bodyFont || DEFAULT_THEME.bodyFont,
    logo: input.logo ?? DEFAULT_THEME.logo,
    favicon: input.favicon ?? DEFAULT_THEME.favicon,
  };
}

export function toWebsiteSettings(settings: {
  contactPhone: string | null;
  contactEmail: string | null;
  contactAddress: string | null;
  socialLinks: unknown;
  businessHours: unknown;
  seoTitle: string | null;
  seoDescription: string | null;
  homepageConfig: unknown;
  footerConfig?: unknown;
}): StorefrontWebsiteSettings {
  const social = asRecord(settings.socialLinks);
  const socialLinks = Object.fromEntries(
    Object.entries(social).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
  return {
    contactPhone: settings.contactPhone,
    contactEmail: settings.contactEmail,
    contactAddress: settings.contactAddress,
    socialLinks,
    businessHours: typeof settings.businessHours === 'object' && settings.businessHours !== null
      ? (settings.businessHours as Record<string, unknown>)
      : null,
    seoTitle: settings.seoTitle,
    seoDescription: settings.seoDescription,
    homepage: toHomepageConfig(settings.homepageConfig),
    footer: toFooterConfig(settings.footerConfig),
  };
}

export function toBootstrap(input: {
  tenant: {
    slug: string;
    name: string;
    legalName: string | null;
    currency: string;
    timezone: string;
    contactPhone: string | null;
    contactEmail: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string;
    postalCode: string | null;
    logo: string | null;
    favicon: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    accentColor: string | null;
  };
  website: {
    logo: string | null;
    favicon: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    accentColor: string | null;
    backgroundColor: string | null;
    foregroundColor: string | null;
    headingFont: string | null;
    bodyFont: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    contactAddress: string | null;
    socialLinks: unknown;
    businessHours: unknown;
    seoTitle: string | null;
    seoDescription: string | null;
    homepageConfig: unknown;
    footerConfig?: unknown;
  } | null;
  navigation: CategorySummary[];
  auth?: StorefrontAuthMethods;
  payments?: StorefrontPaymentMethods;
}): StorefrontBootstrap {
  const website = input.website;
  return {
    tenant: {
      slug: input.tenant.slug,
      name: input.tenant.name,
      legalName: input.tenant.legalName,
      currency: input.tenant.currency,
      timezone: input.tenant.timezone,
      contactPhone: website?.contactPhone ?? input.tenant.contactPhone,
      contactEmail: website?.contactEmail ?? input.tenant.contactEmail,
      address: input.tenant.address,
      city: input.tenant.city,
      state: input.tenant.state,
      country: input.tenant.country,
      postalCode: input.tenant.postalCode,
    },
    theme: mergeTheme({
      logo: website?.logo ?? input.tenant.logo,
      favicon: website?.favicon ?? input.tenant.favicon,
      primaryColor: website?.primaryColor ?? input.tenant.primaryColor,
      secondaryColor: website?.secondaryColor ?? input.tenant.secondaryColor,
      accentColor: website?.accentColor ?? input.tenant.accentColor,
      backgroundColor: website?.backgroundColor,
      foregroundColor: website?.foregroundColor,
      headingFont: website?.headingFont,
      bodyFont: website?.bodyFont,
    }),
    website: toWebsiteSettings(
      website ?? {
        contactPhone: input.tenant.contactPhone,
        contactEmail: input.tenant.contactEmail,
        contactAddress: [input.tenant.address, input.tenant.city].filter(Boolean).join(', ') || null,
        socialLinks: {},
        businessHours: null,
        seoTitle: input.tenant.name,
        seoDescription: null,
        homepageConfig: null,
        footerConfig: null,
      },
    ),
    navigation: input.navigation,
    auth: input.auth ?? {
      passwordLogin: true,
      emailOtp: false,
      smsOtp: false,
      googleSignIn: false,
    },
    payments: input.payments ?? {
      razorpay: false,
      razorpayKeyId: null,
    },
  };
}

export { moneyString };
