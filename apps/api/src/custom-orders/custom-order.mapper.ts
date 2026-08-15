import { moneyString } from '../catalog/money';
import type {
  CustomOrderDetail,
  CustomOrderFileDto,
  CustomOrderItemDto,
  CustomOrderQuoteDto,
  CustomOrderSummary,
  PublicCustomOrder,
} from '@jersey-commerce/types';

export function toIso(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function toFileDto(file: {
  id: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  kind: CustomOrderFileDto['kind'];
  uploadedAt: Date;
}): CustomOrderFileDto {
  return {
    id: file.id,
    originalFilename: file.originalFilename,
    mimeType: file.mimeType,
    fileSize: file.fileSize,
    kind: file.kind,
    uploadedAt: file.uploadedAt.toISOString(),
  };
}

export function toItemDto(item: {
  id: string;
  productVariantId: string | null;
  lineType: CustomOrderItemDto['lineType'];
  playerName: string | null;
  jerseyNumber: string | null;
  size: string | null;
  colour: string | null;
  quantity: number;
  unitPrice: { toFixed: (digits: number) => string };
  customizationFee: { toFixed: (digits: number) => string };
  total: { toFixed: (digits: number) => string };
  notes: string | null;
}): CustomOrderItemDto {
  return {
    id: item.id,
    productVariantId: item.productVariantId,
    lineType: item.lineType,
    playerName: item.playerName,
    jerseyNumber: item.jerseyNumber,
    size: item.size,
    colour: item.colour,
    quantity: item.quantity,
    unitPrice: moneyString(item.unitPrice) ?? '0.00',
    customizationFee: moneyString(item.customizationFee) ?? '0.00',
    total: moneyString(item.total) ?? '0.00',
    notes: item.notes,
  };
}

export function toQuoteDto(quote: {
  id: string;
  quoteNumber: string;
  version: number;
  isCurrent: boolean;
  unitPrice: { toFixed: (digits: number) => string };
  quantity: number;
  customizationCharges: { toFixed: (digits: number) => string };
  subtotal: { toFixed: (digits: number) => string };
  discount: { toFixed: (digits: number) => string };
  tax: { toFixed: (digits: number) => string };
  shippingAmount: { toFixed: (digits: number) => string };
  total: { toFixed: (digits: number) => string };
  depositRequired: { toFixed: (digits: number) => string };
  estimatedCompletionDate: Date | null;
  expiresAt: Date | null;
  acceptanceState: CustomOrderQuoteDto['acceptanceState'];
  acceptedAt: Date | null;
  notes: string | null;
  createdAt: Date;
}): CustomOrderQuoteDto {
  return {
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    version: quote.version,
    isCurrent: quote.isCurrent,
    unitPrice: moneyString(quote.unitPrice) ?? '0.00',
    quantity: quote.quantity,
    customizationCharges: moneyString(quote.customizationCharges) ?? '0.00',
    subtotal: moneyString(quote.subtotal) ?? '0.00',
    discount: moneyString(quote.discount) ?? '0.00',
    tax: moneyString(quote.tax) ?? '0.00',
    shippingAmount: moneyString(quote.shippingAmount) ?? '0.00',
    total: moneyString(quote.total) ?? '0.00',
    depositRequired: moneyString(quote.depositRequired) ?? '0.00',
    estimatedCompletionDate: toIso(quote.estimatedCompletionDate),
    expiresAt: toIso(quote.expiresAt),
    acceptanceState: quote.acceptanceState,
    acceptedAt: toIso(quote.acceptedAt),
    notes: quote.notes,
    createdAt: quote.createdAt.toISOString(),
  };
}

type OrderRecord = {
  id: string;
  publicId: string;
  orderNumber: string;
  status: CustomOrderSummary['status'];
  type: CustomOrderSummary['type'];
  paymentStatus: CustomOrderSummary['paymentStatus'];
  productionStatus: CustomOrderSummary['productionStatus'];
  inventoryState: CustomOrderDetail['inventoryState'];
  description: string | null;
  teamName: string | null;
  preferredJerseyType: string | null;
  preferredColours: string | null;
  customizationRequirements: string | null;
  orderingMode: CustomOrderDetail['orderingMode'];
  estimatedQuantity: number;
  requestedDeliveryDate: Date | null;
  subtotal: { toFixed: (digits: number) => string };
  discount: { toFixed: (digits: number) => string };
  tax: { toFixed: (digits: number) => string };
  shippingAmount: { toFixed: (digits: number) => string };
  total: { toFixed: (digits: number) => string };
  depositRequired: { toFixed: (digits: number) => string };
  depositPaid: { toFixed: (digits: number) => string };
  balanceDue: { toFixed: (digits: number) => string };
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer: { id: string; name: string; phone: string | null; email: string | null };
  items?: Parameters<typeof toItemDto>[0][];
  quotes?: Parameters<typeof toQuoteDto>[0][];
  designs?: Array<{
    id: string;
    version: number;
    notes: string | null;
    approvalStatus: CustomOrderDetail['designs'][number]['approvalStatus'];
    createdAt: Date;
    file: Parameters<typeof toFileDto>[0];
  }>;
  files?: Parameters<typeof toFileDto>[0][];
  payments?: Array<{
    id: string;
    amount: { toFixed: (digits: number) => string };
    method: CustomOrderDetail['payments'][number]['method'];
    status: string;
    reference: string | null;
    createdAt: Date;
  }>;
  customizations?: Array<{
    id: string;
    nameSnapshot: string;
    pricingTypeSnapshot: CustomOrderDetail['customizations'][number]['pricingType'];
    priceSnapshot: { toFixed: (digits: number) => string };
  }>;
  acceptedQuote?: Parameters<typeof toQuoteDto>[0] | null;
  timeline?: Array<{ id: string; type: string; title: string; detail: string | null; createdAt: Date }>;
};

export function toSummary(record: OrderRecord): CustomOrderSummary {
  return {
    id: record.id,
    publicId: record.publicId,
    orderNumber: record.orderNumber,
    status: record.status,
    type: record.type,
    paymentStatus: record.paymentStatus,
    productionStatus: record.productionStatus,
    teamName: record.teamName,
    estimatedQuantity: record.estimatedQuantity,
    total: moneyString(record.total) ?? '0.00',
    depositRequired: moneyString(record.depositRequired) ?? '0.00',
    depositPaid: moneyString(record.depositPaid) ?? '0.00',
    balanceDue: moneyString(record.balanceDue) ?? '0.00',
    customer: record.customer,
    requestedDeliveryDate: toIso(record.requestedDeliveryDate),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toDetail(record: OrderRecord): CustomOrderDetail {
  const quotes = (record.quotes ?? []).map(toQuoteDto);
  return {
    ...toSummary(record),
    description: record.description,
    preferredJerseyType: record.preferredJerseyType,
    preferredColours: record.preferredColours,
    customizationRequirements: record.customizationRequirements,
    orderingMode: record.orderingMode,
    inventoryState: record.inventoryState,
    subtotal: moneyString(record.subtotal) ?? '0.00',
    discount: moneyString(record.discount) ?? '0.00',
    tax: moneyString(record.tax) ?? '0.00',
    shippingAmount: moneyString(record.shippingAmount) ?? '0.00',
    notes: record.notes,
    items: (record.items ?? []).map(toItemDto),
    customizations: (record.customizations ?? []).map((row) => ({
      id: row.id,
      name: row.nameSnapshot,
      pricingType: row.pricingTypeSnapshot,
      price: moneyString(row.priceSnapshot) ?? '0.00',
    })),
    quotes,
    designs: (record.designs ?? []).map((design) => ({
      id: design.id,
      version: design.version,
      notes: design.notes,
      approvalStatus: design.approvalStatus,
      file: toFileDto(design.file),
      createdAt: design.createdAt.toISOString(),
    })),
    files: (record.files ?? []).map(toFileDto),
    payments: (record.payments ?? []).map((payment) => ({
      id: payment.id,
      amount: moneyString(payment.amount) ?? '0.00',
      method: payment.method,
      status: payment.status,
      reference: payment.reference,
      createdAt: payment.createdAt.toISOString(),
    })),
    currentQuote: quotes.find((quote) => quote.isCurrent) ?? null,
    acceptedQuote: record.acceptedQuote ? toQuoteDto(record.acceptedQuote) : quotes.find((quote) => quote.acceptanceState === 'ACCEPTED') ?? null,
  };
}

export function toPublic(record: OrderRecord): PublicCustomOrder {
  const detail = toDetail(record);
  const currentDesign = [...detail.designs].sort((a, b) => b.version - a.version)[0] ?? null;
  return {
    publicId: detail.publicId,
    orderNumber: detail.orderNumber,
    status: detail.status,
    type: detail.type,
    paymentStatus: detail.paymentStatus,
    productionStatus: detail.productionStatus,
    teamName: detail.teamName,
    description: detail.description,
    estimatedQuantity: detail.estimatedQuantity,
    requestedDeliveryDate: detail.requestedDeliveryDate,
    total: detail.total,
    depositRequired: detail.depositRequired,
    depositPaid: detail.depositPaid,
    balanceDue: detail.balanceDue,
    currentQuote: detail.currentQuote,
    currentDesign,
    items: detail.items.map((item) => ({ ...item, notes: null })),
    timeline: (record.timeline ?? []).map((event) => ({
      id: event.id,
      type: event.type,
      title: event.title,
      detail: event.detail,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}
