import type { CatalogStatus, VariantStatus } from './enums';
import type { PaginationMeta } from './api';

export type MoneyString = string;

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  status: CatalogStatus;
  sortOrder: number;
}

export interface CategoryDetail extends CategorySummary {
  description: string | null;
  image: string | null;
  parent: CategorySummary | null;
  children: CategorySummary[];
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImageDto {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductVariantDto {
  id: string;
  sku: string;
  barcode: string | null;
  size: string | null;
  colour: string | null;
  costPrice: MoneyString;
  sellingPrice: MoneyString;
  compareAtPrice: MoneyString | null;
  weight: string | null;
  taxRate: string | null;
  taxInclusive: boolean | null;
  status: VariantStatus;
}

export interface ProductListItem {
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
  variantCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  brand: string | null;
  status: CatalogStatus;
  featured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  category: CategorySummary | null;
  variants: ProductVariantDto[];
  images: ProductImageDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CatalogListMeta extends PaginationMeta {
  limit: number;
  total: number;
}

export const PRODUCT_SORTS = [
  'newest',
  'oldest',
  'name',
  'featured',
  'price-asc',
  'price-desc',
] as const;

export type ProductSort = (typeof PRODUCT_SORTS)[number];
