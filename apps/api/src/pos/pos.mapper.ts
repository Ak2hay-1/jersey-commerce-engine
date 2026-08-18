import { Prisma } from '../prisma/client';
import { availableQuantity, stockStatus } from '../inventory/inventory-math';
import { applyDiscount, lineGross, money, moneyString, roundMoney } from './pos-money';
import type { DiscountType, StockStatus } from '@jersey-commerce/types';

type DecimalLike = Prisma.Decimal | { toFixed: (digits: number) => string };

const asMoney = (value: DecimalLike): Prisma.Decimal =>
  value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value.toFixed(2));

export function toSessionDto(session: {
  id: string;
  tenantId: string;
  userId: string;
  status: string;
  openingCash: DecimalLike;
  closingCash: DecimalLike | null;
  expectedCash: DecimalLike;
  cashSales: DecimalLike;
  cashRefunds: DecimalLike;
  cardSales: DecimalLike;
  upiSales: DecimalLike;
  otherSales: DecimalLike;
  openedAt: Date;
  closedAt: Date | null;
  notes: string | null;
  user?: { id: string; name: string; email: string } | null;
}) {
  return {
    id: session.id,
    tenantId: session.tenantId,
    userId: session.userId,
    status: session.status,
    openingCash: moneyString(session.openingCash),
    closingCash: session.closingCash ? moneyString(session.closingCash) : null,
    expectedCash: moneyString(session.expectedCash),
    cashSales: moneyString(session.cashSales),
    cashRefunds: moneyString(session.cashRefunds),
    cardSales: moneyString(session.cardSales),
    upiSales: moneyString(session.upiSales),
    otherSales: moneyString(session.otherSales),
    openedAt: session.openedAt.toISOString(),
    closedAt: session.closedAt?.toISOString() ?? null,
    notes: session.notes,
    user: session.user ? { id: session.user.id, name: session.user.name, email: session.user.email } : undefined,
  };
}

type CartItemRecord = {
  id: string;
  productVariantId: string;
  quantity: number;
  unitPrice: DecimalLike;
  discountType: DiscountType;
  discountValue: DecimalLike;
  lineTotal: DecimalLike;
  productVariant: {
    sku: string;
    barcode: string | null;
    size: string | null;
    color: string | null;
    sellingPrice: DecimalLike;
    status: string;
    inventory: { quantity: number; reservedQuantity: number; availableQuantity: number; reorderLevel: number } | null;
    product: {
      id: string;
      name: string;
      status: string;
      images: Array<{ url: string; isPrimary: boolean; sortOrder: number }>;
    };
  };
};

export function cartTotals(
  items: Array<{
    quantity: number;
    unitPrice: Prisma.Decimal;
    discountType: DiscountType;
    discountValue: Prisma.Decimal;
  }>,
  cartDiscountType: DiscountType,
  cartDiscountValue: Prisma.Decimal,
) {
  const lineResults = items.map((item) => {
    const gross = lineGross(item.unitPrice, item.quantity);
    const line = applyDiscount(gross, item.discountType, item.discountValue);
    return { gross, ...line };
  });
  const subtotal = roundMoney(lineResults.reduce((sum, item) => sum.add(item.gross), money(0)));
  const lineDiscountTotal = roundMoney(
    lineResults.reduce((sum, item) => sum.add(item.discountAmount), money(0)),
  );
  const merchandise = roundMoney(lineResults.reduce((sum, item) => sum.add(item.net), money(0)));
  const cart = applyDiscount(merchandise, cartDiscountType, cartDiscountValue);
  const totalDiscount = roundMoney(lineDiscountTotal.add(cart.discountAmount));
  return {
    subtotal,
    lineDiscountTotal,
    cartDiscountAmount: cart.discountAmount,
    totalDiscount,
    total: cart.net,
    lineNets: lineResults.map((item) => item.net),
    lineDiscountAmounts: lineResults.map((item) => item.discountAmount),
  };
}

export function toCartDto(
  cart: {
    id: string;
    tenantId: string;
    posSessionId: string;
    userId: string;
    customerId: string | null;
    status: string;
    discountType: DiscountType;
    discountValue: DecimalLike;
    notes: string | null;
    heldAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    customer: { id: string; name: string; phone: string | null; email: string | null } | null;
    items: CartItemRecord[];
  },
) {
  const items = cart.items.map((item) => {
    const unitPrice = asMoney(item.unitPrice);
    const discountValue = asMoney(item.discountValue);
    const gross = lineGross(unitPrice, item.quantity);
    const line = applyDiscount(gross, item.discountType, discountValue);
    const onHand = item.productVariant.inventory?.quantity ?? 0;
    const reserved = item.productVariant.inventory?.reservedQuantity ?? 0;
    const available = availableQuantity(onHand, reserved);
    const primary =
      item.productVariant.product.images.find((image) => image.isPrimary) ??
      item.productVariant.product.images[0] ??
      null;
    return {
      id: item.id,
      productVariantId: item.productVariantId,
      productId: item.productVariant.product.id,
      productName: item.productVariant.product.name,
      sku: item.productVariant.sku,
      barcode: item.productVariant.barcode,
      size: item.productVariant.size,
      colour: item.productVariant.color,
      image: primary?.url ?? null,
      quantity: item.quantity,
      unitPrice: moneyString(unitPrice),
      discountType: item.discountType,
      discountValue: moneyString(discountValue),
      discountAmount: moneyString(line.discountAmount),
      lineTotal: moneyString(line.net),
      availableQuantity: available,
      stockStatus: stockStatus(available, item.productVariant.inventory?.reorderLevel ?? 0),
    };
  });
  const totals = cartTotals(
    cart.items.map((item) => ({
      quantity: item.quantity,
      unitPrice: asMoney(item.unitPrice),
      discountType: item.discountType,
      discountValue: asMoney(item.discountValue),
    })),
    cart.discountType,
    asMoney(cart.discountValue),
  );
  return {
    id: cart.id,
    tenantId: cart.tenantId,
    posSessionId: cart.posSessionId,
    userId: cart.userId,
    status: cart.status,
    customer: cart.customer,
    walkIn: cart.customerId == null,
    discountType: cart.discountType,
    discountValue: moneyString(cart.discountValue),
    cartDiscountAmount: moneyString(totals.cartDiscountAmount),
    notes: cart.notes,
    heldAt: cart.heldAt?.toISOString() ?? null,
    items,
    subtotal: moneyString(totals.subtotal),
    lineDiscountTotal: moneyString(totals.lineDiscountTotal),
    totalDiscount: moneyString(totals.totalDiscount),
    tax: '0.00',
    total: moneyString(totals.total),
    createdAt: cart.createdAt.toISOString(),
    updatedAt: cart.updatedAt.toISOString(),
  };
}

export function toLookupItem(variant: {
  id: string;
  sku: string;
  barcode: string | null;
  size: string | null;
  color: string | null;
  sellingPrice: DecimalLike;
  status: string;
  inventory: { quantity: number; reservedQuantity: number; availableQuantity: number; reorderLevel: number } | null;
  product: {
    id: string;
    name: string;
    status: string;
    images: Array<{ url: string; isPrimary: boolean; sortOrder: number }>;
  };
}): {
  product: { id: string; name: string; status: string; image: string | null };
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
  stockStatus: StockStatus;
} {
  const onHand = variant.inventory?.quantity ?? 0;
  const reserved = variant.inventory?.reservedQuantity ?? 0;
  const available = availableQuantity(onHand, reserved);
  const primary = variant.product.images.find((image) => image.isPrimary) ?? variant.product.images[0] ?? null;
  return {
    product: {
      id: variant.product.id,
      name: variant.product.name,
      status: variant.product.status,
      image: primary?.url ?? null,
    },
    variant: {
      id: variant.id,
      sku: variant.sku,
      barcode: variant.barcode,
      size: variant.size,
      colour: variant.color,
      sellingPrice: moneyString(asMoney(variant.sellingPrice)),
      status: variant.status,
    },
    availableQuantity: available,
    stockStatus: stockStatus(available, variant.inventory?.reorderLevel ?? 0),
  };
}

export function toSaleDto(sale: {
  id: string;
  invoiceNumber: string;
  customerId: string | null;
  cashierId: string | null;
  posSessionId: string | null;
  posCartId: string | null;
  subtotal: DecimalLike;
  discount: DecimalLike;
  discountType?: string;
  discountValue?: DecimalLike;
  tax: DecimalLike;
  taxInclusive?: boolean;
  total: DecimalLike;
  status: string;
  notes: string | null;
  cancelReason: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customer?: { id: string; name: string; phone: string | null } | null;
  cashier?: { id: string; name: string; email: string } | null;
  items: Array<{
    id: string;
    productVariantId: string;
    productName?: string;
    sku?: string;
    size?: string | null;
    color?: string | null;
    quantity: number;
    unitPrice: DecimalLike;
    costPrice: DecimalLike;
    discountType?: string;
    discountValue?: DecimalLike;
    discount: DecimalLike;
    taxRate?: DecimalLike;
    taxInclusive?: boolean;
    tax?: DecimalLike;
    total: DecimalLike;
  }>;
  payments: Array<{
    id: string;
    amount: DecimalLike;
    method: string;
    status: string;
    amountReceived: DecimalLike | null;
    changeDue: DecimalLike | null;
    reference: string | null;
    provider?: string | null;
  }>;
  refunds?: Array<{
    id: string;
    amount: DecimalLike;
    reason: string;
    status: string;
    createdAt: Date;
    items: Array<{
      id: string;
      saleItemId: string;
      quantity: number;
      amount: DecimalLike;
      restock: string;
    }>;
    payments: Array<{
      id: string;
      amount: DecimalLike;
      method: string;
      status: string;
    }>;
  }>;
}) {
  return {
    id: sale.id,
    invoiceNumber: sale.invoiceNumber,
    customerId: sale.customerId,
    cashierId: sale.cashierId,
    posSessionId: sale.posSessionId,
    posCartId: sale.posCartId,
    subtotal: moneyString(sale.subtotal),
    discount: moneyString(sale.discount),
    discountType: sale.discountType ?? 'NONE',
    discountValue: moneyString(sale.discountValue),
    tax: moneyString(sale.tax),
    taxInclusive: sale.taxInclusive ?? true,
    total: moneyString(sale.total),
    status: sale.status,
    notes: sale.notes,
    cancelReason: sale.cancelReason,
    cancelledAt: sale.cancelledAt?.toISOString() ?? null,
    customer: sale.customer ?? null,
    cashier: sale.cashier ?? null,
    items: sale.items.map((item) => ({
      id: item.id,
      productVariantId: item.productVariantId,
      productName: item.productName ?? null,
      sku: item.sku ?? null,
      size: item.size ?? null,
      colour: item.color ?? null,
      quantity: item.quantity,
      unitPrice: moneyString(item.unitPrice),
      costPrice: moneyString(item.costPrice),
      discountType: item.discountType ?? 'NONE',
      discountValue: moneyString(item.discountValue),
      discount: moneyString(item.discount),
      taxRate: moneyString(item.taxRate),
      taxInclusive: item.taxInclusive ?? true,
      tax: moneyString(item.tax ?? 0),
      total: moneyString(item.total),
    })),
    payments: sale.payments.map((payment) => ({
      id: payment.id,
      amount: moneyString(payment.amount),
      method: payment.method,
      status: payment.status,
      amountReceived: payment.amountReceived ? moneyString(payment.amountReceived) : null,
      changeDue: payment.changeDue ? moneyString(payment.changeDue) : null,
      reference: payment.reference,
      provider: payment.provider ?? null,
    })),
    refunds: (sale.refunds ?? []).map((refund) => ({
      id: refund.id,
      amount: moneyString(refund.amount),
      reason: refund.reason,
      status: refund.status,
      createdAt: refund.createdAt.toISOString(),
      items: refund.items.map((item) => ({
        id: item.id,
        saleItemId: item.saleItemId,
        quantity: item.quantity,
        amount: moneyString(item.amount),
        restock: item.restock,
      })),
      payments: refund.payments.map((payment) => ({
        id: payment.id,
        amount: moneyString(payment.amount),
        method: payment.method,
        status: payment.status,
      })),
    })),
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString(),
  };
}
