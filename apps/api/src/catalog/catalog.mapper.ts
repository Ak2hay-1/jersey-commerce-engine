import type {
  CategoryDetail,
  CategorySummary,
  ProductDetail,
  ProductImageDto,
  ProductListItem,
  ProductVariantDto,
} from '@jersey-commerce/types';
import type { CatalogStatus, VariantStatus } from '../prisma/client';
import { decimalString, moneyString } from '../catalog/money';

type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  status: CatalogStatus;
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
  barcode: string | null;
  size: string | null;
  color: string | null;
  costPrice: { toFixed: (digits: number) => string };
  sellingPrice: { toFixed: (digits: number) => string };
  compareAtPrice: { toFixed: (digits: number) => string } | null;
  weight: { toString: () => string } | null;
  taxRate?: { toFixed: (digits: number) => string } | null;
  taxInclusive?: boolean | null;
  status: VariantStatus;
};

export function toCategorySummary(category: CategoryRecord): CategorySummary {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    parentId: category.parentId,
    status: category.status,
    sortOrder: category.sortOrder,
  };
}

export function toCategoryDetail(
  category: CategoryRecord & {
    description: string | null;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
    parent: CategoryRecord | null;
    children: CategoryRecord[];
    _count?: { products: number };
  },
): CategoryDetail {
  return {
    ...toCategorySummary(category),
    description: category.description,
    image: category.image,
    parent: category.parent ? toCategorySummary(category.parent) : null,
    children: category.children.map(toCategorySummary),
    productCount: category._count?.products ?? 0,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

export function toImageDto(image: ImageRecord): ProductImageDto {
  return {
    id: image.id,
    url: image.url,
    altText: image.altText,
    sortOrder: image.sortOrder,
    isPrimary: image.isPrimary,
  };
}

export function toVariantDto(variant: VariantRecord): ProductVariantDto {
  return {
    id: variant.id,
    sku: variant.sku,
    barcode: variant.barcode,
    size: variant.size,
    colour: variant.color,
    costPrice: variant.costPrice.toFixed(2),
    sellingPrice: variant.sellingPrice.toFixed(2),
    compareAtPrice: variant.compareAtPrice ? variant.compareAtPrice.toFixed(2) : null,
    weight: decimalString(variant.weight),
    taxRate: variant.taxRate ? variant.taxRate.toFixed(4) : null,
    taxInclusive: variant.taxInclusive ?? null,
    status: variant.status,
  };
}

export function toProductListItem(
  product: {
    id: string;
    name: string;
    slug: string;
    brand: string | null;
    status: CatalogStatus;
    featured: boolean;
    createdAt: Date;
    updatedAt: Date;
    category: CategoryRecord | null;
    images: ImageRecord[];
    variants: Array<Pick<VariantRecord, 'sellingPrice'>>;
  },
): ProductListItem {
  const prices = product.variants.map((variant) => variant.sellingPrice.toFixed(2)).sort();
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
    lowestPrice: prices[0] ?? null,
    highestPrice: prices[prices.length - 1] ?? null,
    variantCount: product.variants.length,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function toProductDetail(
  product: {
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
    createdAt: Date;
    updatedAt: Date;
    category: CategoryRecord | null;
    images: ImageRecord[];
    variants: VariantRecord[];
  },
): ProductDetail {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    shortDescription: product.shortDescription,
    brand: product.brand,
    status: product.status,
    featured: product.featured,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    category: product.category ? toCategorySummary(product.category) : null,
    variants: product.variants.map(toVariantDto),
    images: product.images.map(toImageDto),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export { moneyString };
