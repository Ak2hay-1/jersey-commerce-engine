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
  const itemRows = payload.items
    .map((item) => {
      const variant = item.variant ? ` <span class="muted">${escapeHtml(item.variant)}</span>` : '';
      return `<tr class="item">
        <td>
          <div>${escapeHtml(item.productName)}${variant}</div>
          <div class="muted">${escapeHtml(item.sku)} × ${item.quantity} @ ${escapeHtml(item.unitPrice)}</div>
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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Receipt ${escapeHtml(payload.transaction.invoiceNumber)}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    body { margin: 0; background: #fff; color: #111; font: 12px/1.25 "Courier New", Courier, monospace; }
    .ticket { width: ${width}; max-width: 80mm; margin: 0 auto; }
    h1 { font-size: 14px; margin: 0 0 4px; text-align: center; text-transform: uppercase; }
    p, td { font-size: 12px; }
    .center { text-align: center; }
    .muted { color: #444; font-size: 11px; }
    .logo { display: none; }
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: top; padding: 1px 0; }
    td.num { text-align: right; white-space: nowrap; }
    .rule { border: 0; border-top: 1px dashed #111; margin: 6px 0; }
    .barcode { margin: 8px 0 0; text-align: center; letter-spacing: 0.18em; font-size: 13px; }
    .qr { width: 48px; height: 48px; margin: 6px auto 0; border: 1px solid #111; }
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
      ${row('Date', payload.transaction.datetime)}
      ${payload.transaction.cashierName ? row('Cashier', payload.transaction.cashierName) : ''}
      ${payload.transaction.customerName ? row('Customer', payload.transaction.customerName) : ''}
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
    <div class="barcode">${escapeHtml(payload.barcode)}</div>
    <div class="qr" title="QR placeholder"></div>
    <p class="center muted">Thank you</p>
  </div>
</body>
</html>`;
}
