import type { PaginationMeta } from './api';
import type { OrderSource, OrderStatus, SaleStatus } from './enums';
import type {
  CustomerActivityType,
  CustomerHistoryType,
  CustomerSegment,
  CustomerStatus,
} from './enums';

export type MoneyString = string;

export interface CustomerPreferenceDto {
  emailOptIn: boolean;
  smsOptIn: boolean;
  whatsappOptIn: boolean;
}

export interface CustomerTagDto {
  id: string;
  name: string;
  slug: string;
}

export interface CustomerAddressDto {
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
}

export interface CustomerMetricsDto {
  totalOrders: number;
  totalSpent: MoneyString;
  averageOrder: MoneyString;
  totalItemsPurchased: number;
  firstPurchaseAt: string | null;
  lastPurchaseAt: string | null;
}

export interface CustomerSummary {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: CustomerStatus;
  city: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerProfile extends CustomerSummary, CustomerAddressDto {
  notes: string | null;
  preference: CustomerPreferenceDto;
  tags: CustomerTagDto[];
  metrics: CustomerMetricsDto;
  segments: CustomerSegment[];
  primarySegment: CustomerSegment | null;
}

export interface CustomerHistoryItem {
  id: string;
  type: CustomerHistoryType;
  source: OrderSource | 'POS';
  reference: string;
  date: string;
  total: MoneyString;
  status: SaleStatus | OrderStatus;
  itemCount: number;
}

export interface CustomerActivityItem {
  at: string;
  type: CustomerActivityType;
  title: string;
  reference?: string;
  amount?: MoneyString;
  status?: string;
  source?: string;
}

export interface CustomerNoteDto {
  id: string;
  body: string;
  createdBy: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDashboardSummary {
  totalCustomers: number;
  newInPeriod: number;
  repeatCustomers: number;
  highValueCustomers: number;
  inactiveCustomers: number;
  settings: {
    highValueThreshold: MoneyString;
    inactiveDays: number;
    newPurchaseCount: number;
    repeatPurchaseCount: number;
  };
}

export interface TopCustomerRow {
  rank: number;
  customer: CustomerSummary;
  totalSpent: MoneyString;
  purchaseCount: number;
  lastPurchaseAt: string | null;
}

export interface InactiveCustomerRow {
  customer: CustomerSummary;
  lastPurchaseAt: string | null;
  totalSpent: MoneyString;
  daysInactive: number;
}

export interface RepeatCustomerRow {
  customer: CustomerSummary;
  purchaseCount: number;
  totalSpent: MoneyString;
  lastPurchaseAt: string | null;
}

export interface CustomerListResult {
  items: CustomerSummary[];
  meta: PaginationMeta;
}

export interface PossibleCustomerMatch {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: CustomerStatus;
  matchedOn: Array<'phone' | 'email'>;
}
