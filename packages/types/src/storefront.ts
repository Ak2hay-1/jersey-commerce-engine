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
  kicker: 'Crafting your identity',
  heading: 'Style is a reflection of the journey — on the street and on the pitch.',
  body: '',
  aboutTitle: 'About us',
  aboutBody: '',
  materialsTitle: 'What materials we use',
  materials: [
    'Heavyweight cotton and French terry for oversized tees.',
    'Breathable knits for replica-inspired match kits.',
    'Low-impact dyes and non-toxic prints wherever possible.',
    'Pieces built to be worn hard, washed often, and kept.',
  ],
  showCollections: true,
  collectionsTitle: 'Featured collections',
  shopTitle: 'Shop',
  contactTitle: 'Contact',
  copyright: '',
};

export interface StorefrontWebsiteSettings {
  contactPhone: string | null;
  contactEmail: string | null;
  contactAddress: string | null;
  socialLinks: StorefrontSocialLinks;
  businessHours: Record<string, unknown> | null;
  seoTitle: string | null;
  seoDescription: string | null;
  homepage: HomepageConfig;
  footer: StorefrontFooter;
}

export interface StorefrontBootstrap {
  tenant: StorefrontTenant;
  theme: StorefrontTheme;
  website: StorefrontWebsiteSettings;
  navigation: CategorySummary[];
  auth: StorefrontAuthMethods;
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
