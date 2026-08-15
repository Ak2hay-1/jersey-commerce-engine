import type { PaginationMeta } from './api';
import type {
  CustomOrderCommunicationType,
  CustomOrderFileKind,
  CustomOrderItemMode,
  CustomOrderPaymentState,
  CustomOrderProductionStatus,
  CustomOrderStatus,
  CustomOrderType,
  CustomizationOptionStatus,
  CustomizationPricingType,
  DesignApprovalDecision,
  DesignApprovalStatus,
  OrderInventoryState,
  PaymentMethod,
  QuoteAcceptanceState,
} from './enums';

export type MoneyString = string;

export interface CustomizationOptionDto {
  id: string;
  name: string;
  description: string | null;
  pricingType: CustomizationPricingType;
  price: MoneyString;
  status: CustomizationOptionStatus;
  sortOrder: number;
}

export interface CustomOrderItemDto {
  id: string;
  productVariantId: string | null;
  lineType: CustomOrderItemMode;
  playerName: string | null;
  jerseyNumber: string | null;
  size: string | null;
  colour: string | null;
  quantity: number;
  unitPrice: MoneyString;
  customizationFee: MoneyString;
  total: MoneyString;
  notes: string | null;
}

export interface CustomOrderQuoteDto {
  id: string;
  quoteNumber: string;
  version: number;
  isCurrent: boolean;
  unitPrice: MoneyString;
  quantity: number;
  customizationCharges: MoneyString;
  subtotal: MoneyString;
  discount: MoneyString;
  tax: MoneyString;
  shippingAmount: MoneyString;
  total: MoneyString;
  depositRequired: MoneyString;
  estimatedCompletionDate: string | null;
  expiresAt: string | null;
  acceptanceState: QuoteAcceptanceState;
  acceptedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CustomOrderFileDto {
  id: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  kind: CustomOrderFileKind;
  uploadedAt: string;
}

export interface CustomOrderDesignDto {
  id: string;
  version: number;
  notes: string | null;
  approvalStatus: DesignApprovalStatus;
  file: CustomOrderFileDto;
  createdAt: string;
}

export interface CustomOrderDesignApprovalDto {
  id: string;
  designId: string;
  designVersion: number;
  decision: DesignApprovalDecision;
  comment: string | null;
  isCustomerDecision: boolean;
  createdAt: string;
}

export interface CustomOrderTimelineItem {
  id: string;
  type: string;
  title: string;
  detail: string | null;
  createdAt: string;
}

export interface CustomOrderProductionEventDto {
  id: string;
  status: CustomOrderProductionStatus;
  note: string | null;
  createdAt: string;
}

export interface CustomOrderNoteDto {
  id: string;
  body: string;
  createdBy: { id: string; name: string };
  createdAt: string;
}

export interface CustomOrderPaymentDto {
  id: string;
  amount: MoneyString;
  method: PaymentMethod;
  status: string;
  reference: string | null;
  createdAt: string;
}

export interface CustomOrderSummary {
  id: string;
  publicId: string;
  orderNumber: string;
  status: CustomOrderStatus;
  type: CustomOrderType;
  paymentStatus: CustomOrderPaymentState;
  productionStatus: CustomOrderProductionStatus | null;
  teamName: string | null;
  estimatedQuantity: number;
  total: MoneyString;
  depositRequired: MoneyString;
  depositPaid: MoneyString;
  balanceDue: MoneyString;
  customer: { id: string; name: string; phone: string | null; email: string | null };
  requestedDeliveryDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomOrderDetail extends CustomOrderSummary {
  description: string | null;
  preferredJerseyType: string | null;
  preferredColours: string | null;
  customizationRequirements: string | null;
  orderingMode: CustomOrderItemMode | null;
  inventoryState: OrderInventoryState;
  subtotal: MoneyString;
  discount: MoneyString;
  tax: MoneyString;
  shippingAmount: MoneyString;
  notes: string | null;
  items: CustomOrderItemDto[];
  customizations: Array<{
    id: string;
    name: string;
    pricingType: CustomizationPricingType;
    price: MoneyString;
  }>;
  quotes: CustomOrderQuoteDto[];
  designs: CustomOrderDesignDto[];
  files: CustomOrderFileDto[];
  payments: CustomOrderPaymentDto[];
  currentQuote: CustomOrderQuoteDto | null;
  acceptedQuote: CustomOrderQuoteDto | null;
}

export interface PublicCustomOrder {
  publicId: string;
  orderNumber: string;
  status: CustomOrderStatus;
  type: CustomOrderType;
  paymentStatus: CustomOrderPaymentState;
  productionStatus: CustomOrderProductionStatus | null;
  teamName: string | null;
  description: string | null;
  estimatedQuantity: number;
  requestedDeliveryDate: string | null;
  total: MoneyString;
  depositRequired: MoneyString;
  depositPaid: MoneyString;
  balanceDue: MoneyString;
  currentQuote: CustomOrderQuoteDto | null;
  currentDesign: CustomOrderDesignDto | null;
  items: CustomOrderItemDto[];
  timeline: CustomOrderTimelineItem[];
}

export interface CustomOrderListResult {
  items: CustomOrderSummary[];
  meta: PaginationMeta;
}

export interface CustomOrderPublicConfig {
  tenant: { slug: string; name: string; currency: string };
  theme: {
    primaryColor: string | null;
    secondaryColor: string | null;
    accentColor: string | null;
    backgroundColor: string | null;
    foregroundColor: string | null;
    logo: string | null;
  };
  customizationOptions: CustomizationOptionDto[];
  types: CustomOrderType[];
}

export type { CustomOrderCommunicationType };
