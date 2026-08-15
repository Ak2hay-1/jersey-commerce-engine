import type { InventoryMovementType, StockStatus } from './enums';
import type { MoneyString } from './catalog';
import type { PaginationMeta } from './api';

export const INVENTORY_SORTS = [
  'updatedAt',
  'quantity',
  'available',
  'reserved',
  'sku',
  'product',
] as const;

export type InventorySort = (typeof INVENTORY_SORTS)[number];

export interface InventorySnapshot {
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
  stockStatus: StockStatus;
}

export interface InventoryListItem extends InventorySnapshot {
  id: string;
  productVariantId: string;
  productId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  barcode: string | null;
  size: string | null;
  colour: string | null;
  categoryId: string | null;
  categoryName: string | null;
  costPrice: MoneyString;
  sellingPrice: MoneyString;
  productStatus: string;
  variantStatus: string;
  updatedAt: string;
}

export interface InventoryDetail extends InventoryListItem {
  createdAt: string;
}

export interface InventoryLookupItem {
  product: { id: string; name: string; status: string };
  variant: {
    id: string;
    sku: string;
    barcode: string | null;
    size: string | null;
    colour: string | null;
    status: string;
  };
  sku: string;
  barcode: string | null;
  sellingPrice: MoneyString;
  costPrice: MoneyString;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
  status: StockStatus;
}

export interface InventorySummary {
  totalVariants: number;
  totalUnits: number;
  lowStockVariants: number;
  outOfStockVariants: number;
  reservedUnits: number;
  inventoryValue: MoneyString;
}

export interface InventoryMovementItem {
  id: string;
  productVariantId: string;
  date: string;
  type: InventoryMovementType;
  quantity: number;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  unitCost: MoneyString | null;
  user: { id: string; name: string } | null;
  createdAt: string;
}

export interface InventoryMutationResult {
  inventory: InventoryDetail;
  movement: InventoryMovementItem | null;
}

export interface InventoryListResult {
  items: InventoryListItem[];
  meta: PaginationMeta;
}
