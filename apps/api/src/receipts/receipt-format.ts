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

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Format receipt datetime for India storefronts (Asia/Kolkata). Accepts ISO or Date-parseable strings. */
export function formatReceiptDateTime(value: string, timeZone = 'Asia/Kolkata'): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en-IN', {
    timeZone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function truncateSku(sku: string, max = 28): string {
  const trimmed = sku.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 1)}…`;
}

export function buildWhatsAppReceiptText(payload: ReceiptPayload): string {
  const lines: string[] = [
    `*${payload.business.name}*`,
    `Invoice: ${payload.transaction.invoiceNumber}`,
    `Date: ${formatReceiptDateTime(payload.transaction.datetime)}`,
  ];
  if (payload.transaction.customerName) {
    lines.push(`Customer: ${payload.transaction.customerName}`);
  }
  lines.push('');
  for (const item of payload.items) {
    const variant = item.variant ? ` (${item.variant})` : '';
    lines.push(`${item.productName}${variant}`);
    lines.push(`  ${item.quantity} × ${item.unitPrice} = ${item.lineTotal}`);
  }
  lines.push('');
  lines.push(`Subtotal: ${payload.totals.subtotal}`);
  if (payload.totals.discount !== '0.00') {
    lines.push(`Discount: ${payload.totals.discount}`);
  }
  lines.push(`*Total: ${payload.business.currency} ${payload.totals.total}*`);
  for (const payment of payload.payments) {
    lines.push(`Paid via ${payment.method}: ${payment.amount}`);
  }
  lines.push('');
  lines.push('Thank you for shopping with Jerzyfy!');
  return lines.join('\n');
}

function row(label: string, value: string, strong = false): string {
  const labelHtml = strong ? `<strong>${escapeHtml(label)}</strong>` : escapeHtml(label);
  const valueHtml = strong ? `<strong>${escapeHtml(value)}</strong>` : escapeHtml(value);
  return `<tr><td>${labelHtml}</td><td class="num">${valueHtml}</td></tr>`;
}

export function renderReceiptHtml(payload: ReceiptPayload, layout: 'print' | 'thermal' = 'print'): string {
  const width = layout === 'thermal' ? '72mm' : '320px';
  const businessLines = [
    payload.business.address,
    [payload.business.city, payload.business.state, payload.business.postalCode].filter(Boolean).join(', '),
    payload.business.phone,
    payload.business.email,
  ].filter((line): line is string => Boolean(line && line.trim()));
  const displayDate = formatReceiptDateTime(payload.transaction.datetime);
  const itemRows = payload.items
    .map((item) => {
      const title = item.variant
        ? `${escapeHtml(item.productName)} · ${escapeHtml(item.variant)}`
        : escapeHtml(item.productName);
      const skuLine = item.sku
        ? `<div class="muted sku">${escapeHtml(truncateSku(item.sku))} · Qty ${item.quantity} @ ${escapeHtml(item.unitPrice)}</div>`
        : `<div class="muted">Qty ${item.quantity} @ ${escapeHtml(item.unitPrice)}</div>`;
      return `<tr class="item">
        <td>
          <div class="item-name">${title}</div>
          ${skuLine}
        </td>
        <td class="num">${escapeHtml(item.lineTotal)}</td>
      </tr>`;
    })
    .join('');
  const paymentRows = payload.payments
    .map((payment) => {
      const extra =
        payment.method === 'CASH' && payment.amountReceived
          ? `<div class="muted">Recv ${escapeHtml(payment.amountReceived)}${payment.changeDue ? ` · Chg ${escapeHtml(payment.changeDue)}` : ''}</div>`
          : payment.reference
            ? `<div class="muted">${escapeHtml(payment.reference)}</div>`
            : '';
      return `${row(payment.method, payment.amount)}${extra ? `<tr><td colspan="2">${extra}</td></tr>` : ''}`;
    })
    .join('');
  const logo = payload.business.logo
    ? `<img class="logo" alt="" src="${escapeHtml(payload.business.logo)}" />`
    : '';
  const invoice = escapeHtml(payload.transaction.invoiceNumber);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Receipt ${invoice}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    body { margin: 0; background: #fff; color: #111; font: 12px/1.25 "Courier New", Courier, monospace; }
    .ticket { width: ${width}; max-width: 80mm; margin: 0 auto; }
    h1 { font-size: 14px; margin: 0 0 4px; text-align: center; text-transform: uppercase; }
    p, td { font-size: 12px; }
    .center { text-align: center; }
    .muted { color: #444; font-size: 11px; }
    .logo { display: block; max-width: 48px; max-height: 48px; margin: 0 auto 6px; object-fit: contain; }
    .item-name { font-weight: 600; word-break: break-word; }
    .sku { word-break: break-all; }
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: top; padding: 1px 0; }
    td.num { text-align: right; white-space: nowrap; }
    .rule { border: 0; border-top: 1px dashed #111; margin: 6px 0; }
    .barcode { margin: 8px 0 0; text-align: center; letter-spacing: 0.12em; font-size: 12px; }
    .qr {
      width: 56px; height: 56px; margin: 6px auto 0; border: 1px solid #111;
      display: flex; align-items: center; justify-content: center;
      font-size: 8px; letter-spacing: 0.04em; text-align: center; line-height: 1.1; padding: 2px;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="ticket">
    ${logo}
    <h1>${escapeHtml(payload.business.name)}</h1>
    <p class="center muted">${businessLines.map(escapeHtml).join('<br />')}</p>
    <hr class="rule" />
    <table>
      ${row('Invoice', payload.transaction.invoiceNumber)}
      ${row('Date', displayDate)}
      ${payload.transaction.cashierName ? row('Cashier', payload.transaction.cashierName) : ''}
      ${payload.transaction.customerName ? row('Customer', payload.transaction.customerName) : ''}
      ${payload.transaction.customerPhone ? row('Phone', payload.transaction.customerPhone) : ''}
    </table>
    <hr class="rule" />
    <table>${itemRows}</table>
    <hr class="rule" />
    <table>
      ${row('Subtotal', payload.totals.subtotal)}
      ${row(`Discount${payload.totals.discountType === 'PERCENTAGE' ? ` ${payload.totals.discountValue}%` : ''}`, payload.totals.discount)}
      ${row(payload.totals.taxInclusive ? 'Tax (incl.)' : 'Tax', payload.totals.tax)}
      ${row('TOTAL', payload.totals.total, true)}
    </table>
    <hr class="rule" />
    <table>${paymentRows}</table>
    <div class="barcode">${invoice}</div>
    <div class="qr" title="Invoice ${invoice}">${invoice}</div>
    <p class="center muted">Thank you</p>
  </div>
</body>
</html>`;
}
