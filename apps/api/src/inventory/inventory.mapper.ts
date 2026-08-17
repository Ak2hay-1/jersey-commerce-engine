import type {
  InventoryDetail,
  InventoryListItem,
  InventoryLookupItem,
  InventoryMovementItem,
  InventoryMovementType,
} from '@jersey-commerce/types';
import { moneyString } from '../catalog/money';
import { stockStatus } from './inventory-math';

type DecimalLike = { toFixed: (digits: number) => string } | null;

export type InventoryRecord = {
  id: string;
  productVariantId: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
  createdAt: Date;
  updatedAt: Date;
  productVariant: {
    id: string;
    sku: string;
    barcode: string | null;
    size: string | null;
    color: string | null;
    status: string;
    costPrice: DecimalLike;
    sellingPrice: DecimalLike;
    product: {
      id: string;
      name: string;
      status: string;
      categoryId: string | null;
      category: { id: string; name: string } | null;
    };
  };
};

export type MovementRecord = {
  id: string;
  productVariantId: string;
  quantity: number;
  type: InventoryMovementType;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  unitCost: DecimalLike;
  createdAt: Date;
  createdByUser: { id: string; name: string } | null;
};

function variantLabel(size: string | null, colour: string | null): string {
  return [size, colour].filter(Boolean).join(' / ') || 'Default';
}

export function toInventoryListItem(record: InventoryRecord): InventoryListItem {
  const available = record.quantity - record.reservedQuantity;
  return {
    id: record.id,
    productVariantId: record.productVariantId,
    productId: record.productVariant.product.id,
    productName: record.productVariant.product.name,
    variantLabel: variantLabel(record.productVariant.size, record.productVariant.color),
    sku: record.productVariant.sku,
    barcode: record.productVariant.barcode,
    size: record.productVariant.size,
    colour: record.productVariant.color,
    categoryId: record.productVariant.product.categoryId,
    categoryName: record.productVariant.product.category?.name ?? null,
    costPrice: record.productVariant.costPrice?.toFixed(2) ?? '0.00',
    sellingPrice: record.productVariant.sellingPrice?.toFixed(2) ?? '0.00',
    quantity: record.quantity,
    reservedQuantity: record.reservedQuantity,
    availableQuantity: available,
    reorderLevel: record.reorderLevel,
    stockStatus: stockStatus(record.quantity, record.reorderLevel),
    productStatus: record.productVariant.product.status,
    variantStatus: record.productVariant.status,
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toInventoryDetail(record: InventoryRecord): InventoryDetail {
  return {
    ...toInventoryListItem(record),
    createdAt: record.createdAt.toISOString(),
  };
}

export function toMovementItem(record: MovementRecord): InventoryMovementItem {
  return {
    id: record.id,
    productVariantId: record.productVariantId,
    date: record.createdAt.toISOString(),
    type: record.type,
    quantity: record.quantity,
    reason: record.reason,
    referenceType: record.referenceType,
    referenceId: record.referenceId,
    unitCost: moneyString(record.unitCost),
    user: record.createdByUser,
    createdAt: record.createdAt.toISOString(),
  };
}

export function toLookupItem(record: InventoryRecord): InventoryLookupItem {
  const available = record.quantity - record.reservedQuantity;
  return {
    product: {
      id: record.productVariant.product.id,
      name: record.productVariant.product.name,
      status: record.productVariant.product.status,
    },
    variant: {
      id: record.productVariant.id,
      sku: record.productVariant.sku,
      barcode: record.productVariant.barcode,
      size: record.productVariant.size,
      colour: record.productVariant.color,
      status: record.productVariant.status,
    },
    sku: record.productVariant.sku,
    barcode: record.productVariant.barcode,
    sellingPrice: record.productVariant.sellingPrice?.toFixed(2) ?? '0.00',
    costPrice: record.productVariant.costPrice?.toFixed(2) ?? '0.00',
    quantity: record.quantity,
    reservedQuantity: record.reservedQuantity,
    availableQuantity: available,
    reorderLevel: record.reorderLevel,
    status: stockStatus(record.quantity, record.reorderLevel),
  };
}

export const inventoryDetailInclude = {
  productVariant: {
    include: {
      product: { include: { category: { select: { id: true, name: true } } } },
    },
  },
} as const;

export const movementInclude = {
  createdByUser: { select: { id: true, name: true } },
} as const;
