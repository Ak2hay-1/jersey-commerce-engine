import type { PaginationMeta } from './api';
import type {
  DashboardPaymentGroup,
  DateRangePreset,
  ExpenseStatus,
  OrderSource,
  PaymentMethod,
  RevenueGranularity,
  SaleStatus,
  StockStatus,
} from './enums';

export type MoneyString = string;

export interface ReportDateRange {
  preset: DateRangePreset;
  from: string;
  to: string;
  timeZone: string;
}

export interface ProfitabilityTotals {
  revenue: MoneyString;
  cogs: MoneyString;
  grossProfit: MoneyString;
  marginPercent: MoneyString;
  quantity: number;
  orderCount: number;
  discount: MoneyString;
  tax: MoneyString;
}

export interface DashboardKpiCard {
  key: string;
  label: string;
  value: MoneyString | number;
  kind: 'money' | 'count';
  available: boolean;
}

export interface DashboardSummary {
  range: ReportDateRange;
  kpis: {
    revenue: MoneyString | null;
    grossProfit: MoneyString | null;
    cogs: MoneyString | null;
    marginPercent: MoneyString | null;
    orders: number | null;
    averageOrderValue: MoneyString | null;
    customers: number | null;
    inventoryValue: MoneyString | null;
    outstandingSupplierBalance: MoneyString | null;
    expenses: MoneyString | null;
  };
  salesChannels: Array<{ source: OrderSource; revenue: MoneyString; count: number }>;
  payments: Array<{ method: DashboardPaymentGroup; amount: MoneyString }>;
  expensesByCategory: Array<{ category: string; amount: MoneyString }>;
  inventory: {
    available: boolean;
    lowStockCount: number;
    outOfStockCount: number;
    inventoryValue: MoneyString;
    sellingValue: MoneyString;
  };
  customers: {
    available: boolean;
    newCustomers: number;
    repeatCustomers: number;
    highValueCustomers: number;
    inactiveCustomers: number;
  };
  purchases: {
    available: boolean;
    purchaseCount: number;
    purchaseTotal: MoneyString;
    outstandingSupplierBalance: MoneyString;
  };
}

export interface RevenuePoint {
  bucket: string;
  label: string;
  revenue: MoneyString;
}

export interface RevenueSeries {
  range: ReportDateRange;
  granularity: RevenueGranularity;
  points: RevenuePoint[];
}

export interface TopProductRow {
  productId: string;
  productName: string;
  quantity: number;
  revenue: MoneyString;
  cogs: MoneyString;
  grossProfit: MoneyString;
  marginPercent: MoneyString;
}

export interface RecentSaleRow {
  id: string;
  invoiceNumber: string;
  customerName: string | null;
  cashierName: string | null;
  source: OrderSource;
  amount: MoneyString;
  paymentMethod: PaymentMethod | null;
  status: SaleStatus;
  createdAt: string;
}

export interface RecentOrderRow {
  id: string;
  orderNumber: string;
  customerName: string | null;
  source: OrderSource;
  amount: MoneyString;
  paymentStatus: string;
  status: string;
  createdAt: string;
}

export interface InventoryAlertRow {
  productVariantId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
  stockStatus: StockStatus;
}

export interface DashboardWidgets {
  topProducts: TopProductRow[];
  recentSales: RecentSaleRow[];
  recentOrders: RecentOrderRow[];
  lowStock: InventoryAlertRow[];
  outOfStock: InventoryAlertRow[];
}

export interface SalesReportRow {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  source: OrderSource;
  cashierId: string | null;
  cashierName: string | null;
  customerId: string | null;
  customerName: string | null;
  paymentMethod: PaymentMethod | null;
  status: SaleStatus;
  quantity: number;
  revenue: MoneyString;
  discount: MoneyString;
  tax: MoneyString;
  cogs: MoneyString;
  grossProfit: MoneyString;
  marginPercent: MoneyString;
}

export interface SalesReportResult {
  range: ReportDateRange;
  totals: ProfitabilityTotals;
  items: SalesReportRow[];
  meta: PaginationMeta;
}

export interface InventoryReportRow {
  productVariantId: string;
  productId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  categoryId: string | null;
  categoryName: string | null;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
  costPrice: MoneyString;
  sellingPrice: MoneyString;
  costValue: MoneyString;
  sellingValue: MoneyString;
  stockStatus: StockStatus;
}

export interface InventoryReportResult {
  totals: {
    variants: number;
    quantity: number;
    reservedQuantity: number;
    availableQuantity: number;
    costValue: MoneyString;
    sellingValue: MoneyString;
    lowStock: number;
    outOfStock: number;
  };
  items: InventoryReportRow[];
  meta: PaginationMeta;
}

export interface PurchaseReportRow {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  status: string;
  createdAt: string;
  quantityOrdered: number;
  quantityReceived: number;
  total: MoneyString;
  paid: MoneyString;
  outstanding: MoneyString;
}

export interface PurchaseReportResult {
  range: ReportDateRange;
  totals: {
    purchaseCount: number;
    quantityOrdered: number;
    quantityReceived: number;
    total: MoneyString;
    outstanding: MoneyString;
  };
  items: PurchaseReportRow[];
  meta: PaginationMeta;
}

export interface CustomerReportRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: string;
  orderCount: number;
  totalSpent: MoneyString;
  averageOrderValue: MoneyString;
  lastPurchaseAt: string | null;
  segment: string;
}

export interface CustomerReportResult {
  range: ReportDateRange;
  totals: {
    newCustomers: number;
    repeatCustomers: number;
    highValueCustomers: number;
    inactiveCustomers: number;
    totalSpending: MoneyString;
    averageOrderValue: MoneyString;
  };
  items: CustomerReportRow[];
  meta: PaginationMeta;
}

export interface PaymentReportResult {
  range: ReportDateRange;
  totals: {
    totalPayments: MoneyString;
    refunds: MoneyString;
    net: MoneyString;
  };
  methods: Array<{
    method: DashboardPaymentGroup;
    payments: MoneyString;
    refunds: MoneyString;
    net: MoneyString;
  }>;
}

export interface ExpenseReportRow {
  id: string;
  category: string;
  amount: MoneyString;
  expenseDate: string;
  paymentMethod: PaymentMethod;
  status: ExpenseStatus;
  description: string | null;
}

export interface ExpenseReportResult {
  range: ReportDateRange;
  totals: {
    totalExpenses: MoneyString;
  };
  byCategory: Array<{ category: string; amount: MoneyString }>;
  trend: Array<{ bucket: string; label: string; amount: MoneyString }>;
  items: ExpenseReportRow[];
  meta: PaginationMeta;
}

export interface CustomOrderReportResult {
  range: ReportDateRange;
  counts: Record<string, number>;
  totals: {
    enquiries: number;
    quotes: number;
    confirmedOrders: number;
    productionOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    quotedValue: MoneyString;
    confirmedValue: MoneyString;
    outstandingBalances: MoneyString;
  };
}

export interface ProductProfitabilityRow {
  productId: string;
  productName: string;
  quantity: number;
  revenue: MoneyString;
  cogs: MoneyString;
  grossProfit: MoneyString;
  marginPercent: MoneyString;
}
