export const TENANT_STATUSES = ['ACTIVE', 'SUSPENDED', 'TRIAL', 'CANCELLED'] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

export const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const ROLE_CODES = [
  'OWNER',
  'MANAGER',
  'CASHIER',
  'INVENTORY_MANAGER',
  'WEBSITE_MANAGER',
] as const;
export type RoleCode = (typeof ROLE_CODES)[number];

export const CATALOG_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
export type CatalogStatus = (typeof CATALOG_STATUSES)[number];

export const VARIANT_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type VariantStatus = (typeof VARIANT_STATUSES)[number];

export const INVENTORY_MOVEMENT_TYPES = [
  'OPENING_STOCK',
  'PURCHASE',
  'SALE',
  'ONLINE_ORDER',
  'RETURN',
  'EXCHANGE',
  'DAMAGE',
  'ADJUSTMENT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'CANCELLED_ORDER',
] as const;
export type InventoryMovementType = (typeof INVENTORY_MOVEMENT_TYPES)[number];

export const SUPPLIER_STATUSES = ['ACTIVE', 'INACTIVE', 'BLOCKED'] as const;
export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number];

export const PURCHASE_STATUSES = [
  'DRAFT',
  'ORDERED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED',
] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

export const SALE_STATUSES = ['COMPLETED', 'VOIDED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

export const ORDER_SOURCES = ['WEBSITE', 'POS', 'WHATSAPP', 'MANUAL'] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'READY',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
  'RETURNED',
  'REFUNDED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'ONLINE', 'OTHER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const SUPPLIER_PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER'] as const;
export type SupplierPaymentMethod = (typeof SUPPLIER_PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = [
  'PENDING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const REFUND_STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const RESTOCK_DISPOSITIONS = ['RESTOCK', 'DAMAGE', 'NONE'] as const;
export type RestockDisposition = (typeof RESTOCK_DISPOSITIONS)[number];

export const BACKUP_INTERVAL_UNITS = ['HOURS', 'DAYS', 'WEEKS', 'MONTHS'] as const;
export type BackupIntervalUnit = (typeof BACKUP_INTERVAL_UNITS)[number];

export const BACKUP_RUN_TRIGGERS = ['SCHEDULED', 'MANUAL'] as const;
export type BackupRunTrigger = (typeof BACKUP_RUN_TRIGGERS)[number];

export const BACKUP_RUN_STATUSES = ['RUNNING', 'SUCCESS', 'FAILED'] as const;
export type BackupRunStatus = (typeof BACKUP_RUN_STATUSES)[number];

export const POS_SESSION_STATUSES = ['OPEN', 'CLOSED'] as const;
export type PosSessionStatus = (typeof POS_SESSION_STATUSES)[number];

export const POS_CART_STATUSES = ['ACTIVE', 'HELD', 'COMPLETED', 'CANCELLED'] as const;
export type PosCartStatus = (typeof POS_CART_STATUSES)[number];

export const DISCOUNT_TYPES = ['NONE', 'FIXED', 'PERCENTAGE'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const CART_STATUSES = ['ACTIVE', 'CONVERTED', 'ABANDONED', 'EXPIRED'] as const;
export type CartStatus = (typeof CART_STATUSES)[number];

export const FULFILLMENT_METHODS = ['DELIVERY', 'STORE_PICKUP'] as const;
export type FulfillmentMethod = (typeof FULFILLMENT_METHODS)[number];

export const SHIPPING_CALCULATION_MODES = ['FREE', 'FIXED'] as const;
export type ShippingCalculationMode = (typeof SHIPPING_CALCULATION_MODES)[number];

export const ORDER_INVENTORY_STATES = ['NONE', 'RESERVED', 'RELEASED', 'CONSUMED'] as const;
export type OrderInventoryState = (typeof ORDER_INVENTORY_STATES)[number];

export const ORDER_PAYMENT_STATES = [
  'PAYMENT_PENDING',
  'PAYMENT_COMPLETED',
  'PAYMENT_FAILED',
  'PAYMENT_CANCELLED',
  'PAYMENT_REFUNDED',
  'PAYMENT_PARTIALLY_REFUNDED',
] as const;
export type OrderPaymentState = (typeof ORDER_PAYMENT_STATES)[number];

export const ORDER_TRACKING_STEPS = [
  'PLACED',
  'PAYMENT_CONFIRMED',
  'PROCESSING',
  'READY',
  'SHIPPED',
  'COMPLETED',
] as const;
export type OrderTrackingStepKey = (typeof ORDER_TRACKING_STEPS)[number];

export const STOCK_STATUSES = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

export const CUSTOMER_STATUSES = ['ACTIVE', 'INACTIVE', 'BLOCKED'] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const CUSTOMER_SEGMENTS = ['NEW', 'REPEAT', 'HIGH_VALUE', 'INACTIVE'] as const;
export type CustomerSegment = (typeof CUSTOMER_SEGMENTS)[number];

export const CUSTOMER_HISTORY_TYPES = ['POS_SALE', 'ORDER'] as const;
export type CustomerHistoryType = (typeof CUSTOMER_HISTORY_TYPES)[number];

export const CUSTOMER_ACTIVITY_TYPES = [
  'CUSTOMER_CREATED',
  'POS_SALE',
  'ORDER',
  'NOTE_ADDED',
  'TAG_ADDED',
] as const;
export type CustomerActivityType = (typeof CUSTOMER_ACTIVITY_TYPES)[number];

export const CUSTOMER_TOP_SORTS = ['totalSpent', 'purchaseCount'] as const;
export type CustomerTopSort = (typeof CUSTOMER_TOP_SORTS)[number];
