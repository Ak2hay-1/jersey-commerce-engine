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

export const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'ONLINE', 'BANK_TRANSFER', 'OTHER'] as const;
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

export const CUSTOMER_HISTORY_TYPES = ['POS_SALE', 'ORDER', 'CUSTOM_ORDER'] as const;
export type CustomerHistoryType = (typeof CUSTOMER_HISTORY_TYPES)[number];

export const CUSTOMER_ACTIVITY_TYPES = [
  'CUSTOMER_CREATED',
  'POS_SALE',
  'ORDER',
  'CUSTOM_ORDER',
  'NOTE_ADDED',
  'TAG_ADDED',
] as const;
export type CustomerActivityType = (typeof CUSTOMER_ACTIVITY_TYPES)[number];

export const CUSTOMER_TOP_SORTS = ['totalSpent', 'purchaseCount'] as const;
export type CustomerTopSort = (typeof CUSTOMER_TOP_SORTS)[number];

export const CUSTOM_ORDER_TYPES = [
  'CUSTOM_JERSEY',
  'TEAM_ORDER',
  'CORPORATE_ORDER',
  'COLLEGE_ORDER',
  'TOURNAMENT_ORDER',
  'BULK_ORDER',
] as const;
export type CustomOrderType = (typeof CUSTOM_ORDER_TYPES)[number];

export const CUSTOM_ORDER_STATUSES = [
  'INQUIRY',
  'QUOTATION',
  'QUOTE_SENT',
  'CUSTOMER_APPROVAL',
  'DEPOSIT_PENDING',
  'CONFIRMED',
  'DESIGN_PENDING',
  'DESIGN_APPROVAL',
  'PRODUCTION',
  'READY',
  'COMPLETED',
  'CANCELLED',
] as const;
export type CustomOrderStatus = (typeof CUSTOM_ORDER_STATUSES)[number];

export const CUSTOM_ORDER_ITEM_MODES = ['PLAYER_LIST', 'SIZE_QUANTITY'] as const;
export type CustomOrderItemMode = (typeof CUSTOM_ORDER_ITEM_MODES)[number];

export const CUSTOMIZATION_PRICING_TYPES = ['FIXED', 'PER_ITEM', 'PERCENTAGE'] as const;
export type CustomizationPricingType = (typeof CUSTOMIZATION_PRICING_TYPES)[number];

export const CUSTOMIZATION_OPTION_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type CustomizationOptionStatus = (typeof CUSTOMIZATION_OPTION_STATUSES)[number];

export const CUSTOM_ORDER_FILE_KINDS = ['REFERENCE', 'DESIGN'] as const;
export type CustomOrderFileKind = (typeof CUSTOM_ORDER_FILE_KINDS)[number];

export const DESIGN_APPROVAL_DECISIONS = ['APPROVE', 'REQUEST_CHANGES'] as const;
export type DesignApprovalDecision = (typeof DESIGN_APPROVAL_DECISIONS)[number];

export const DESIGN_APPROVAL_STATUSES = ['PENDING', 'APPROVED', 'CHANGES_REQUESTED'] as const;
export type DesignApprovalStatus = (typeof DESIGN_APPROVAL_STATUSES)[number];

export const QUOTE_ACCEPTANCE_STATES = ['PENDING', 'ACCEPTED', 'EXPIRED', 'SUPERSEDED', 'CANCELLED'] as const;
export type QuoteAcceptanceState = (typeof QUOTE_ACCEPTANCE_STATES)[number];

export const CUSTOM_ORDER_PAYMENT_STATES = ['UNPAID', 'DEPOSIT_RECEIVED', 'PARTIALLY_PAID', 'PAID'] as const;
export type CustomOrderPaymentState = (typeof CUSTOM_ORDER_PAYMENT_STATES)[number];

export const CUSTOM_ORDER_PRODUCTION_STATUSES = [
  'DESIGN_PENDING',
  'DESIGN_APPROVAL',
  'MATERIAL_PENDING',
  'PRODUCTION',
  'QUALITY_CHECK',
  'READY',
] as const;
export type CustomOrderProductionStatus = (typeof CUSTOM_ORDER_PRODUCTION_STATUSES)[number];

export const CUSTOM_ORDER_COMMUNICATION_TYPES = [
  'QUOTE_CREATED',
  'QUOTE_SENT',
  'DESIGN_READY',
  'DESIGN_APPROVAL_REQUIRED',
  'ORDER_CONFIRMED',
  'PRODUCTION_STARTED',
  'READY_FOR_PICKUP',
  'ORDER_COMPLETED',
] as const;
export type CustomOrderCommunicationType = (typeof CUSTOM_ORDER_COMMUNICATION_TYPES)[number];

export const EXPENSE_STATUSES = ['ACTIVE', 'VOIDED'] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const EXPENSE_CATEGORY_NAMES = [
  'Rent',
  'Electricity',
  'Salary',
  'Transport',
  'Marketing',
  'Packaging',
  'Maintenance',
  'Miscellaneous',
] as const;
export type ExpenseCategoryName = (typeof EXPENSE_CATEGORY_NAMES)[number];

export const DATE_RANGE_PRESETS = [
  'today',
  'yesterday',
  'last_7_days',
  'last_30_days',
  'this_month',
  'last_month',
  'custom',
] as const;
export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];

export const REVENUE_GRANULARITIES = ['daily', 'weekly', 'monthly'] as const;
export type RevenueGranularity = (typeof REVENUE_GRANULARITIES)[number];

export const TOP_PRODUCT_SORTS = ['quantity', 'revenue', 'profit'] as const;
export type TopProductSort = (typeof TOP_PRODUCT_SORTS)[number];

export const REPORT_EXPORT_FORMATS = ['csv'] as const;
export type ReportExportFormat = (typeof REPORT_EXPORT_FORMATS)[number];

export const DASHBOARD_PAYMENT_GROUPS = ['CASH', 'UPI', 'CARD', 'ONLINE', 'OTHER'] as const;
export type DashboardPaymentGroup = (typeof DASHBOARD_PAYMENT_GROUPS)[number];
