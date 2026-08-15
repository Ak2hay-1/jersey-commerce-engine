import { money, moneyString, remainingQuantity } from './purchase-money';
import type { Prisma, PurchaseStatus, SupplierPaymentMethod, PaymentStatus } from '../prisma/client';

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export const purchaseListInclude = {
  supplier: { select: { id: true, name: true, status: true } },
  items: true,
  payments: { where: { status: 'COMPLETED' } },
} satisfies Prisma.PurchaseInclude;

export const purchaseDetailInclude = {
  supplier: {
    select: {
      id: true,
      name: true,
      contactPerson: true,
      phone: true,
      email: true,
      status: true,
    },
  },
  items: {
    include: {
      productVariant: {
        select: { id: true, sku: true, size: true, color: true, product: { select: { id: true, name: true } } },
      },
    },
    orderBy: { id: 'asc' as const },
  },
  receipts: {
    include: { items: true },
    orderBy: { createdAt: 'asc' as const },
  },
  payments: { orderBy: { paidAt: 'asc' as const } },
  createdBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.PurchaseInclude;

export type PurchaseListRecord = Prisma.PurchaseGetPayload<{ include: typeof purchaseListInclude }>;
export type PurchaseDetailRecord = Prisma.PurchaseGetPayload<{ include: typeof purchaseDetailInclude }>;

function paidFromItems(payments: Array<{ amount: { toString(): string }; status: PaymentStatus }>): string {
  const sum = payments
    .filter((payment) => payment.status === 'COMPLETED')
    .reduce((acc, payment) => acc.add(money(payment.amount.toString())), money(0));
  return moneyString(sum);
}

export function toPurchaseListItem(record: PurchaseListRecord) {
  const amountPaid = paidFromItems(record.payments);
  const outstanding =
    record.status === 'CANCELLED' || record.status === 'DRAFT'
      ? '0.00'
      : moneyString(money(record.total.toString()).sub(money(amountPaid)));
  return {
    id: record.id,
    purchaseNumber: record.purchaseNumber,
    status: record.status as PurchaseStatus,
    supplier: record.supplier,
    subtotal: moneyString(record.subtotal),
    discount: moneyString(record.discount),
    tax: moneyString(record.tax),
    total: moneyString(record.total),
    amountPaid,
    outstandingAmount: outstanding,
    expectedDeliveryDate: toIso(record.expectedDeliveryDate),
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt),
  };
}

export function toPurchaseDetail(record: PurchaseDetailRecord) {
  const amountPaid = paidFromItems(record.payments);
  const payable = record.status !== 'CANCELLED' && record.status !== 'DRAFT';
  const outstanding = payable ? moneyString(money(record.total.toString()).sub(money(amountPaid))) : '0.00';
  const orderedQuantity = record.items.reduce((sum, item) => sum + item.orderedQuantity, 0);
  const receivedQuantity = record.items.reduce((sum, item) => sum + item.receivedQuantity, 0);
  const receivedCost = record.items.reduce((sum, item) => {
    if (item.orderedQuantity <= 0 || item.receivedQuantity <= 0) {
      return sum;
    }
    return sum.add(money(item.total.toString()).mul(item.receivedQuantity).div(item.orderedQuantity));
  }, money(0));
  return {
    id: record.id,
    purchaseNumber: record.purchaseNumber,
    status: record.status,
    supplier: record.supplier,
    notes: record.notes,
    expectedDeliveryDate: toIso(record.expectedDeliveryDate),
    createdBy: record.createdBy,
    orderedAt: toIso(record.orderedAt),
    receivedAt: toIso(record.receivedAt),
    cancelledAt: toIso(record.cancelledAt),
    cancelReason: record.cancelReason,
    items: record.items.map((item) => ({
      id: item.id,
      productVariantId: item.productVariantId,
      sku: item.productVariant.sku,
      productName: item.productVariant.product.name,
      size: item.productVariant.size,
      color: item.productVariant.color,
      orderedQuantity: item.orderedQuantity,
      receivedQuantity: item.receivedQuantity,
      remainingQuantity: remainingQuantity(item.orderedQuantity, item.receivedQuantity),
      unitCost: moneyString(item.unitCost),
      discount: moneyString(item.discount),
      tax: moneyString(item.tax),
      total: moneyString(item.total),
    })),
    receipts: record.receipts.map((receipt) => ({
      id: receipt.id,
      notes: receipt.notes,
      createdAt: toIso(receipt.createdAt),
      items: receipt.items.map((line) => ({
        productVariantId: line.productVariantId,
        quantity: line.quantity,
        unitCost: moneyString(line.unitCost),
      })),
    })),
    payments: record.payments.map(toSupplierPaymentDto),
    orderedQuantity,
    receivedQuantity,
    remainingQuantity: remainingQuantity(orderedQuantity, receivedQuantity),
    orderedCost: moneyString(record.total),
    receivedCost: moneyString(receivedCost),
    subtotal: moneyString(record.subtotal),
    discount: moneyString(record.discount),
    tax: moneyString(record.tax),
    total: moneyString(record.total),
    amountPaid,
    outstandingAmount: outstanding,
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt),
  };
}

export function toSupplierPaymentDto(record: {
  id: string;
  supplierId: string;
  purchaseId: string | null;
  amount: { toString(): string };
  method: SupplierPaymentMethod;
  status: PaymentStatus;
  reference: string | null;
  notes: string | null;
  paidAt: Date;
  createdAt: Date;
  createdById?: string | null;
  supplier?: { id: string; name: string; status: string } | null;
}) {
  return {
    id: record.id,
    supplierId: record.supplierId,
    purchaseId: record.purchaseId,
    amount: moneyString(record.amount.toString()),
    paymentMethod: record.method,
    status: record.status,
    reference: record.reference,
    notes: record.notes,
    paidAt: toIso(record.paidAt),
    createdAt: toIso(record.createdAt),
    createdById: record.createdById ?? null,
    supplier: record.supplier ?? null,
  };
}
