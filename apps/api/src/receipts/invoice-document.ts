import type { ReceiptPayload } from './receipt-format';

type MoneyLike = { toFixed: (digits: number) => string };

export interface InvoiceLine {
  description: string;
  detail: string | null;
  unitPrice: string;
  quantity: number;
  total: string;
}

export interface InvoiceDocument {
  business: {
    name: string;
    addressLine: string | null;
    contactLine: string | null;
  };
  billTo: {
    name: string;
    phone: string | null;
    addressLines: string[];
  };
  invoiceNumber: string;
  issuedAt: string;
  reference: string | null;
  currency: string;
  lines: InvoiceLine[];
  subtotal: string;
  discount: string;
  shipping: string;
  tax: string;
  taxInclusive: boolean;
  total: string;
  payments: string[];
  notes: string[];
}

const DEFAULT_NOTES = ['Thank you for shopping with Jerzyfy!', 'Please keep this bill for exchanges.'];

function money(value: MoneyLike | string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '0.00';
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toFixed(2) : value;
  }
  if (typeof value === 'number') {
    return value.toFixed(2);
  }
  return value.toFixed(2);
}

function joinParts(parts: Array<string | null | undefined>, separator = ', '): string | null {
  const joined = parts.map((part) => part?.trim()).filter(Boolean).join(separator);
  return joined || null;
}

function titleCase(method: string): string {
  return method
    .toLowerCase()
    .split('_')
    .map((word) => (word === 'upi' ? 'UPI' : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}

export function invoiceFromSalePayload(payload: ReceiptPayload): InvoiceDocument {
  const business = payload.business;
  return {
    business: {
      name: business.name,
      addressLine: joinParts([business.address, business.city, business.state, business.postalCode]),
      contactLine: joinParts([business.phone, business.email], ' · '),
    },
    billTo: {
      name: payload.transaction.customerName?.trim() || 'Walk-in customer',
      phone: payload.transaction.customerPhone,
      addressLines: [],
    },
    invoiceNumber: payload.transaction.invoiceNumber,
    issuedAt: payload.transaction.datetime,
    reference: payload.transaction.cashierName ? `Cashier: ${payload.transaction.cashierName}` : null,
    currency: business.currency,
    lines: payload.items.map((item) => ({
      description: item.variant ? `${item.productName} · ${item.variant}` : item.productName,
      detail: item.sku || null,
      unitPrice: money(item.unitPrice),
      quantity: item.quantity,
      total: money(item.lineTotal),
    })),
    subtotal: money(payload.totals.subtotal),
    discount: money(payload.totals.discount),
    shipping: '0.00',
    tax: money(payload.totals.tax),
    taxInclusive: payload.totals.taxInclusive,
    total: money(payload.totals.total),
    payments: payload.payments.map((payment) => {
      const parts = [`${titleCase(payment.method)} ${money(payment.amount)}`];
      if (payment.method === 'CASH' && payment.amountReceived) {
        parts.push(`Recv ${money(payment.amountReceived)}`);
        if (payment.changeDue) {
          parts.push(`Chg ${money(payment.changeDue)}`);
        }
      } else if (payment.reference) {
        parts.push(`Ref ${payment.reference}`);
      }
      return parts.join(' · ');
    }),
    notes: DEFAULT_NOTES,
  };
}

export type InvoiceOrderInput = {
  orderNumber: string;
  createdAt: Date;
  currency: string;
  subtotal: MoneyLike;
  discount: MoneyLike;
  shippingAmount: MoneyLike;
  tax: MoneyLike;
  total: MoneyLike;
  paymentStatus: string;
  tenant: {
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
  };
  customer: { name: string; phone: string | null } | null;
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
  } | null;
  items: Array<{
    productNameSnapshot: string;
    skuSnapshot: string;
    sizeSnapshot: string | null;
    colorSnapshot: string | null;
    quantity: number;
    unitPrice: MoneyLike;
    total: MoneyLike;
    taxInclusive: boolean;
  }>;
  payments: Array<{ method: string; status: string; amount: MoneyLike; reference: string | null }>;
};

export function invoiceFromOrder(order: InvoiceOrderInput): InvoiceDocument {
  const address = order.shippingAddress;
  const payments = order.payments
    .filter((payment) => payment.status !== 'FAILED' && payment.status !== 'CANCELLED')
    .map((payment) => {
      const status = payment.status === 'COMPLETED' ? 'Paid' : payment.method === 'COD' ? 'Due on delivery' : 'Pending';
      const label = payment.method === 'COD' ? 'Cash on delivery' : titleCase(payment.method);
      return [`${label} ${money(payment.amount)}`, status, payment.reference ? `Ref ${payment.reference}` : null]
        .filter(Boolean)
        .join(' · ');
    });
  return {
    business: {
      name: order.tenant.name,
      addressLine: joinParts([order.tenant.address, order.tenant.city, order.tenant.state, order.tenant.postalCode]),
      contactLine: joinParts([order.tenant.contactPhone, order.tenant.contactEmail], ' · '),
    },
    billTo: {
      name: address?.fullName || order.customer?.name || 'Customer',
      phone: address?.phone || order.customer?.phone || null,
      addressLines: address
        ? [
            joinParts([address.addressLine1, address.addressLine2]) ?? '',
            joinParts([address.city, address.state, address.postalCode]) ?? '',
          ].filter(Boolean)
        : [],
    },
    invoiceNumber: order.orderNumber,
    issuedAt: order.createdAt.toISOString(),
    reference: null,
    currency: order.currency,
    lines: order.items.map((item) => {
      const variant = joinParts([item.sizeSnapshot, item.colorSnapshot], ' / ');
      return {
        description: variant ? `${item.productNameSnapshot} · ${variant}` : item.productNameSnapshot,
        detail: item.skuSnapshot || null,
        unitPrice: money(item.unitPrice),
        quantity: item.quantity,
        total: money(item.total),
      };
    }),
    subtotal: money(order.subtotal),
    discount: money(order.discount),
    shipping: money(order.shippingAmount),
    tax: money(order.tax),
    taxInclusive: order.items.every((item) => item.taxInclusive),
    total: money(order.total),
    payments,
    notes: DEFAULT_NOTES,
  };
}

export function sampleInvoice(businessName = 'Jerzyfy'): InvoiceDocument {
  return {
    business: { name: businessName, addressLine: 'Sample address', contactLine: null },
    billTo: { name: 'Test Customer', phone: null, addressLines: [] },
    invoiceNumber: 'TEST-0001',
    issuedAt: new Date().toISOString(),
    reference: 'Test message',
    currency: 'INR',
    lines: [
      { description: 'Sample jersey · L', detail: 'SAMPLE-SKU', unitPrice: '999.00', quantity: 1, total: '999.00' },
    ],
    subtotal: '999.00',
    discount: '0.00',
    shipping: '0.00',
    tax: '0.00',
    taxInclusive: true,
    total: '999.00',
    payments: ['UPI 999.00 · Paid'],
    notes: DEFAULT_NOTES,
  };
}
