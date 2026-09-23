import type { OrderDetail } from '@jersey-commerce/types';

function moneyLine(currency: string, amount: string): string {
  return `${currency} ${amount}`;
}

export function formatOrderCreatedTelegram(order: OrderDetail): string {
  const customer = order.customer?.name ?? 'Guest';
  const phone = order.customer?.phone ? ` · ${order.customer.phone}` : '';
  return [
    'New order',
    `#${order.orderNumber}`,
    `Source: ${order.source}`,
    `Customer: ${customer}${phone}`,
    `Total: ${moneyLine(order.currency, order.total)}`,
    `Payment: ${order.paymentStatus} · ${order.fulfillmentMethod}`,
    `Items: ${order.items.length}`,
  ].join('\n');
}

export function formatOrderStatusTelegram(order: {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  cancelReason?: string | null;
  customerName?: string | null;
  total?: string | null;
  currency?: string | null;
}): string {
  const lines = [
    order.status === 'CANCELLED' ? 'Order cancelled' : 'Order status updated',
    `#${order.orderNumber}`,
    `Status: ${order.status}`,
    `Payment: ${order.paymentStatus}`,
  ];
  if (order.customerName) {
    lines.push(`Customer: ${order.customerName}`);
  }
  if (order.total && order.currency) {
    lines.push(`Total: ${moneyLine(order.currency, order.total)}`);
  }
  if (order.cancelReason) {
    lines.push(`Reason: ${order.cancelReason}`);
  }
  return lines.join('\n');
}

export function formatPaymentConfirmedTelegram(input: {
  orderNumber: string | null;
  paymentId: string;
  amount?: string | null;
  currency?: string | null;
  customerName?: string | null;
}): string {
  const lines = [
    'Payment confirmed',
    input.orderNumber ? `Order #${input.orderNumber}` : `Payment ${input.paymentId}`,
  ];
  if (input.customerName) {
    lines.push(`Customer: ${input.customerName}`);
  }
  if (input.amount && input.currency) {
    lines.push(`Amount: ${moneyLine(input.currency, input.amount)}`);
  }
  return lines.join('\n');
}

export function formatCustomOrderTelegram(input: {
  orderNumber: string;
  teamName?: string | null;
  customerName?: string | null;
  phone?: string | null;
  type?: string | null;
}): string {
  const lines = ['Custom kit enquiry', `#${input.orderNumber}`];
  if (input.teamName) {
    lines.push(`Team: ${input.teamName}`);
  }
  if (input.customerName) {
    const phone = input.phone ? ` · ${input.phone}` : '';
    lines.push(`Customer: ${input.customerName}${phone}`);
  }
  if (input.type) {
    lines.push(`Type: ${input.type}`);
  }
  return lines.join('\n');
}

export function formatPosSaleTelegram(input: {
  invoiceNumber: string;
  total: string;
  currency?: string;
  customerName?: string | null;
  itemCount: number;
}): string {
  const currency = input.currency ?? 'INR';
  const lines = [
    'POS sale',
    `Invoice ${input.invoiceNumber}`,
    `Total: ${moneyLine(currency, input.total)}`,
    `Items: ${input.itemCount}`,
  ];
  if (input.customerName) {
    lines.push(`Customer: ${input.customerName}`);
  }
  return lines.join('\n');
}
