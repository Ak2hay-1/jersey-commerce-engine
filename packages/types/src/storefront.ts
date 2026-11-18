import type { CatalogStatus, FulfillmentMethod, StockStatus } from './enums';
import type { PaginationMeta } from './api';
import type { StorefrontAuthMethods } from './auth-settings';
import type {
  CategoryDetail,
  CategorySummary,
  MoneyString,
  ProductImageDto,
  ProductSort,
} from './catalog';
import type { CartDto, CartTotalsDto } from './orders';
import type { StorefrontPaymentMethods } from './payment-settings';

export const STOREFRONT_AVAILABILITY = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as const;
export type StorefrontAvailability = (typeof STOREFRONT_AVAILABILITY)[number];

export const HOMEPAGE_SECTION_TYPES = [
  'hero',
  'marquee',
  'statement',
  'featured-categories',
  'featured-products',
  'promo-banner',
  'best-sellers',
  'new-arrivals',
  'trust',
  'cta',
] as const;
export type HomepageSectionType = (typeof HOMEPAGE_SECTION_TYPES)[number];

/** Desktop hero / slider artwork. Cropped with object-cover on smaller screens. */
export const HERO_BANNER_SPEC = {
  ratio: '8:3',
  width: 1920,
  height: 720,
  mimeHint: 'JPEG, PNG, or WEBP up to 5MB',
} as const;

/** Premium collection tile artwork. Matches the storefront 4:5 card. */
export const COLLECTION_TILE_SPEC = {
  ratio: '4:5',
  width: 1080,
  height: 1350,
  mimeHint: 'JPEG, PNG, or WEBP up to 5MB',
} as const;

export const TENANT_HOST_KINDS = ['DOMAIN', 'SUBDOMAIN'] as const;
export type TenantHostKind = (typeof TENANT_HOST_KINDS)[number];

export const CHECKOUT_ISSUE_CODES = [
  'CART_EMPTY',
  'CART_EXPIRED',
  'ITEM_UNAVAILABLE',
  'INSUFFICIENT_STOCK',
  'PRICE_CHANGED',
  'PROMO_INVALID',
] as const;
export type CheckoutIssueCode = (typeof CHECKOUT_ISSUE_CODES)[number];

export interface StorefrontTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  foregroundColor: string;
  headingFont: string;
  bodyFont: string;
  logo: string | null;
  favicon: string | null;
}

export interface StorefrontTenant {
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
}

export interface StorefrontSocialLinks {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  youtube?: string;
  whatsapp?: string;
  [key: string]: string | undefined;
}

export interface StorefrontTrustItem {
  title: string;
  description: string;
}

export interface HomepageBannerSlide {
  id?: string;
  image: string;
  heading?: string;
  subheading?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface HomepageSection {
  type: HomepageSectionType;
  enabled: boolean;
  heading?: string;
  subheading?: string;
  image?: string;
  ctaLabel?: string;
  ctaHref?: string;
  categorySlugs?: string[];
  productSlugs?: string[];
  items?: StorefrontTrustItem[];
  slides?: HomepageBannerSlide[];
}

export interface HomepageConfig {
  sections: HomepageSection[];
}

export interface StorefrontFooter {
  kicker: string;
  heading: string;
  body: string;
  aboutTitle: string;
  aboutBody: string;
  materialsTitle: string;
  materials: string[];
  showCollections: boolean;
  collectionsTitle: string;
  shopTitle: string;
  contactTitle: string;
  copyright: string;
}

export const DEFAULT_STOREFRONT_FOOTER: StorefrontFooter = {
  kicker: 'Jerzyfy',
  heading: 'The game never stops. Neither should your style.',
  body: '',
  aboutTitle: 'About us',
  aboutBody: '',
  materialsTitle: 'What materials we use',
  materials: [
    'Breathable knits for replica-inspired match kits.',
    'Durable prints built for match day and everyday wear.',
    'Low-impact dyes and non-toxic prints wherever possible.',
    'Pieces built to be worn hard, washed often, and kept.',
  ],
  showCollections: false,
  collectionsTitle: 'Featured collections',
  shopTitle: 'Shop',
  contactTitle: 'Contact',
  copyright: '',
};

export interface StorefrontHeaderNavItem {
  href: string;
  label: string;
}

export interface StorefrontQualityTier {
  id: string;
  title: string;
  intro: string;
  bullets: string[];
  closing: string;
}

export interface StorefrontSizeChartRow {
  size: string;
  chest: string;
  length: string;
}

export interface StorefrontGuidesConfig {
  qualityTiers: StorefrontQualityTier[];
  sizeChartIntro: string;
  sizeChartRows: StorefrontSizeChartRow[];
  sizeChartNote: string;
}

export const DEFAULT_STOREFRONT_GUIDES: StorefrontGuidesConfig = {
  qualityTiers: [
    {
      id: 'master',
      title: 'MASTER / FAN VERSION',
      intro: 'Everyday match-day quality — the classic fan jersey for stands, street, and training.',
      bullets: [
        'Comfortable replica-inspired fabric',
        'Regular athletic fit',
        'Durable printed logos & crests',
        'Breathable for all-day wear',
        'Great value for weekly wear',
      ],
      closing: 'Perfect for fans who want authentic look and everyday comfort without match-day pricing.',
    },
    {
      id: 'player',
      title: 'PLAYER VERSION {Authentic}',
      intro: 'The highest quality for modern football jerseys, inspired by what professionals wear on the pitch.',
      bullets: [
        'Premium performance fabric',
        'Lightweight & breathable',
        'Athletic/slim fit',
        'Heat-pressed logos & authentic-style detailing',
        'Premium Thailand imported quality',
      ],
      closing: 'Perfect for those who want the closest experience to a professional match jersey.',
    },
    {
      id: 'retro',
      title: 'AUTHENTIC RETRO JERSEYS',
      intro: 'Classic seasons brought back — heritage colourways, period detailing, and throwback fits.',
      bullets: [
        'Season-inspired heritage designs',
        'Soft, durable fabric with vintage feel',
        'Period-correct logos & numbering style',
        'Relaxed to regular retro fit',
        'Collectible club & national classics',
      ],
      closing: 'Built for fans who wear history — iconic kits from seasons that still hit.',
    },
  ],
  sizeChartIntro:
    'Our jerseys follow a regular athletic replica fit — true to size for most fans. Prefer a looser street look? Size up. Between sizes? Choose the larger size for comfort across the chest and shoulders.',
  sizeChartRows: [
    { size: 'S', chest: '96–101', length: '70' },
    { size: 'M', chest: '102–107', length: '72' },
    { size: 'L', chest: '108–113', length: '74' },
    { size: 'XL', chest: '114–119', length: '76' },
    { size: 'XXL', chest: '120–125', length: '78' },
  ],
  sizeChartNote:
    'Measure a favourite jersey flat: chest is armpit to armpit × 2; length is from the high point of the shoulder to the hem. All measurements in centimetres.',
};

export interface StorefrontChromeConfig {
  announcementMessages: string[];
  headerNav: StorefrontHeaderNavItem[];
  guides: StorefrontGuidesConfig;
}

export const DEFAULT_STOREFRONT_CHROME: StorefrontChromeConfig = {
  announcementMessages: [
    'Free delivery on orders above ₹2,000',
    'Secure checkout with Razorpay',
    'Replica-inspired football jerseys',
  ],
  headerNav: [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'Shop' },
    { href: '/custom-orders', label: 'Customize' },
    { href: '/wholesale', label: 'Wholesale' },
  ],
  guides: DEFAULT_STOREFRONT_GUIDES,
};

export interface StorefrontWebsiteSettings {
  contactPhone: string | null;
  contactEmail: string | null;
  contactAddress: string | null;
  grievanceOfficerName: string | null;
  grievanceOfficerEmail: string | null;
  socialLinks: StorefrontSocialLinks;
  businessHours: Record<string, unknown> | null;
  seoTitle: string | null;
  seoDescription: string | null;
  homepage: HomepageConfig;
  footer: StorefrontFooter;
  chrome: StorefrontChromeConfig;
}

export interface StorefrontBootstrap {
  tenant: StorefrontTenant;
  theme: StorefrontTheme;
  website: StorefrontWebsiteSettings;
  navigation: CategorySummary[];
  auth: StorefrontAuthMethods;
  payments: StorefrontPaymentMethods;
}

export interface StorefrontResolvedTenant {
  slug: string;
  name: string;
  status: string;
}

export interface StorefrontVariant {
  id: string;
  sku: string;
  size: string | null;
  colour: string | null;
  sellingPrice: MoneyString;
  compareAtPrice: MoneyString | null;
  availability: StorefrontAvailability;
  remaining: number | null;
}

export interface StorefrontProductListItem {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  status: CatalogStatus;
  featured: boolean;
  category: CategorySummary | null;
  primaryImage: ProductImageDto | null;
  lowestPrice: MoneyString | null;
  highestPrice: MoneyString | null;
  compareAtPrice: MoneyString | null;
  variantCount: number;
  availability: StorefrontAvailability;
  createdAt: string;
  updatedAt: string;
}

export interface StorefrontProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  brand: string | null;
  featured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  category: CategorySummary | null;
  images: ProductImageDto[];
  variants: StorefrontVariant[];
  sizes: string[];
  colours: string[];
  lowestPrice: MoneyString | null;
  highestPrice: MoneyString | null;
  compareAtPrice: MoneyString | null;
  related: StorefrontProductListItem[];
  createdAt: string;
  updatedAt: string;
}

export interface StorefrontCatalogFacets {
  sizes: string[];
  colours: string[];
  brands: string[];
  minPrice: MoneyString | null;
  maxPrice: MoneyString | null;
}

export interface StorefrontProductListResult {
  items: StorefrontProductListItem[];
  meta: PaginationMeta & { limit: number; total: number };
  facets: StorefrontCatalogFacets;
}

export interface StorefrontSearchSuggestion {
  type: 'product' | 'category';
  id: string;
  name: string;
  slug: string;
  href: string;
  imageUrl: string | null;
}

export interface StorefrontSearchResult {
  query: string;
  suggestions: StorefrontSearchSuggestion[];
  products: StorefrontProductListItem[];
  meta: PaginationMeta & { limit: number; total: number };
}

export interface StorefrontCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
}

export interface StorefrontAuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  customer: StorefrontCustomer;
}

export interface CheckoutIssue {
  code: CheckoutIssueCode;
  message: string;
  itemId?: string;
  productName?: string;
}

export interface CheckoutQuote {
  cart: CartDto;
  totals: CartTotalsDto;
  fulfillmentMethod: FulfillmentMethod;
  issues: CheckoutIssue[];
  canCheckout: boolean;
}

export type {
  CategoryDetail,
  CategorySummary,
  ProductSort,
  StockStatus,
};
