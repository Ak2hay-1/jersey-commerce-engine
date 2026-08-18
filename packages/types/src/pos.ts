import type { PaginationMeta } from './api';
import type { CustomerSummary } from './customers';
import type {
  DiscountType,
  PaymentMethod,
  PaymentStatus,
  PosCartStatus,
  PosSessionStatus,
  RefundStatus,
  RestockDisposition,
  SaleStatus,
  StockStatus,
} from './enums';

export const POS_TENDER_METHODS = ['CASH', 'UPI', 'CARD', 'OTHER'] as const;
export type PosTenderMethod = (typeof POS_TENDER_METHODS)[number];

export const POS_SALE_SORTS = [
  'created_desc',
  'created_asc',
  'total_desc',
  'total_asc',
  'invoice_asc',
] as const;
export type PosSaleSort = (typeof POS_SALE_SORTS)[number];

export const POS_RECEIPT_FORMATS = ['json', 'html', 'thermal', 'pdf', 'email'] as const;
export type PosReceiptFormat = (typeof POS_RECEIPT_FORMATS)[number];

export interface PosSessionUser {
  id: string;
  name: string;
  email: string;
}

export interface PosSessionDto {
  id: string;
  tenantId: string;
  userId: string;
  status: PosSessionStatus | string;
  openingCash: string;
  closingCash: string | null;
  expectedCash: string;
  cashSales: string;
  cashRefunds: string;
  cardSales: string;
  upiSales: string;
  otherSales: string;
  openedAt: string;
  closedAt: string | null;
  notes: string | null;
  user?: PosSessionUser;
}

export interface PosCartCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

export interface PosCartItemDto {
  id: string;
  productVariantId: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string | null;
  size: string | null;
  colour: string | null;
  image: string | null;
  quantity: number;
  unitPrice: string;
  discountType: DiscountType | string;
  discountValue: string;
  discountAmount: string;
  lineTotal: string;
  availableQuantity: number;
  stockStatus: StockStatus | string;
}

export interface PosCartDto {
  id: string;
  tenantId: string;
  posSessionId: string;
  userId: string;
  status: PosCartStatus | string;
  customer: PosCartCustomer | null;
  walkIn: boolean;
  discountType: DiscountType | string;
  discountValue: string;
  cartDiscountAmount: string;
  notes: string | null;
  heldAt: string | null;
  items: PosCartItemDto[];
  subtotal: string;
  lineDiscountTotal: string;
  totalDiscount: string;
  tax: string;
  total: string;
  createdAt: string;
  updatedAt: string;
}

export interface PosLookupItem {
  product: {
    id: string;
    name: string;
    status: string;
    image: string | null;
  };
  variant: {
    id: string;
    sku: string;
    barcode: string | null;
    size: string | null;
    colour: string | null;
    sellingPrice: string;
    status: string;
  };
  availableQuantity: number;
  stockStatus: StockStatus | string;
}

export interface PosSaleParty {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface PosSaleItemDto {
  id: string;
  productVariantId: string;
  productName: string | null;
  sku: string | null;
  size: string | null;
  colour: string | null;
  quantity: number;
  unitPrice: string;
  costPrice: string;
  discountType: DiscountType | string;
  discountValue: string;
  discount: string;
  taxRate: string;
  taxInclusive: boolean;
  tax: string;
  total: string;
}

export interface PosSalePaymentDto {
  id: string;
  amount: string;
  method: PaymentMethod | string;
  status: PaymentStatus | string;
  amountReceived: string | null;
  changeDue: string | null;
  reference: string | null;
  provider: string | null;
}

export interface PosRefundItemDto {
  id: string;
  saleItemId: string;
  quantity: number;
  amount: string;
  restock: RestockDisposition | string;
}

export interface PosRefundPaymentDto {
  id: string;
  amount: string;
  method: PaymentMethod | string;
  status: PaymentStatus | string;
}

export interface PosRefundDto {
  id: string;
  amount: string;
  reason: string;
  status: RefundStatus | string;
  createdAt: string;
  items: PosRefundItemDto[];
  payments: PosRefundPaymentDto[];
}

export interface PosSaleDto {
  id: string;
  invoiceNumber: string;
  customerId: string | null;
  cashierId: string | null;
  posSessionId: string | null;
  posCartId: string | null;
  subtotal: string;
  discount: string;
  discountType: DiscountType | string;
  discountValue: string;
  tax: string;
  taxInclusive: boolean;
  total: string;
  status: SaleStatus | string;
  notes: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  customer: PosSaleParty | null;
  cashier: PosSaleParty | null;
  items: PosSaleItemDto[];
  payments: PosSalePaymentDto[];
  refunds: PosRefundDto[];
  createdAt: string;
  updatedAt: string;
}

export interface PosNewCustomerInput {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  allowDuplicate?: boolean;
}

export interface PosCartCustomerInput {
  customerId?: string;
  walkIn?: boolean;
  newCustomer?: PosNewCustomerInput;
}

export interface CreatePosCartInput extends PosCartCustomerInput {
  discountType?: DiscountType;
  discountValue?: string;
  notes?: string;
}

export type UpdatePosCartInput = CreatePosCartInput;

export interface AddPosCartItemInput {
  productVariantId: string;
  quantity?: number;
  discountType?: DiscountType;
  discountValue?: string;
}

export interface UpdatePosCartItemInput {
  quantity?: number;
  discountType?: DiscountType;
  discountValue?: string;
}

export interface PosPaymentInput {
  method: PaymentMethod;
  amount?: string;
  amountReceived?: string;
  reference?: string;
  provider?: string;
  confirmed?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CompletePosSaleInput {
  cartId?: string;
  payments: PosPaymentInput[];
  notes?: string;
}

export interface CancelPosSaleInput {
  reason: string;
}

export interface RefundPosItemInput {
  saleItemId: string;
  quantity: number;
  restock?: RestockDisposition;
}

export interface RefundPosPaymentInput {
  paymentId?: string;
  method?: PaymentMethod;
  amount?: string;
  confirmed?: boolean;
  reference?: string;
  provider?: string;
}

export interface RefundPosSaleInput {
  reason: string;
  items?: RefundPosItemInput[];
  payments?: RefundPosPaymentInput[];
  confirmed?: boolean;
}

export interface OpenPosSessionInput {
  openingCash: string;
  notes?: string;
}

export interface ClosePosSessionInput {
  closingCash: string;
  notes?: string;
}

export interface PosSaleQuery {
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
  cashierId?: string;
  sessionId?: string;
  paymentMethod?: PaymentMethod;
  invoiceNumber?: string;
  customerId?: string;
  status?: SaleStatus;
  minAmount?: string;
  maxAmount?: string;
  sort?: PosSaleSort;
}

export interface ReceiptBusiness {
  name: string;
  logo: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  currency: string;
}

export interface ReceiptItem {
  productName: string;
  variant: string | null;
  sku: string;
  quantity: number;
  unitPrice: string;
  discount: string;
  tax: string;
  lineTotal: string;
}

export interface ReceiptPayment {
  method: string;
  amount: string;
  amountReceived: string | null;
  changeDue: string | null;
  reference: string | null;
  provider: string | null;
}

export interface ReceiptPayload {
  business: ReceiptBusiness;
  transaction: {
    saleId: string;
    invoiceNumber: string;
    datetime: string;
    cashierName: string | null;
    posSessionId: string | null;
    status: string;
    customerName: string | null;
    customerPhone: string | null;
  };
  items: ReceiptItem[];
  totals: {
    subtotal: string;
    discount: string;
    discountType: string;
    discountValue: string;
    tax: string;
    taxInclusive: boolean;
    total: string;
  };
  payments: ReceiptPayment[];
  barcode: string;
}

export interface PosReceiptResponse {
  format: PosReceiptFormat | string;
  contentType?: string;
  html?: string;
  prepared?: boolean;
  available?: boolean;
  message?: string;
  data: ReceiptPayload;
}

export interface PosSessionListResult {
  items: PosSessionDto[];
  meta: PaginationMeta;
}

export interface PosCartListResult {
  items: PosCartDto[];
}

export interface PosLookupResult {
  items: PosLookupItem[];
}

export interface PosCustomerLookupResult {
  items: CustomerSummary[];
}

export interface PosSaleListResult {
  items: PosSaleDto[];
  meta: PaginationMeta;
}
