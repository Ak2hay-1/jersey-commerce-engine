import PDFDocument from 'pdfkit';
import type { InvoiceDocument } from './invoice-document';

const PAGE_WIDTH = 595.28;
const MARGIN_X = 50;
const CONTENT_RIGHT = PAGE_WIDTH - MARGIN_X;
const ACCENT = '#c8ad93';
const INK = '#111111';
const MUTED = '#8a8a8a';
const RULE = '#cfcfcf';

const COL_DESC = MARGIN_X + 12;
const COL_PRICE = 360;
const COL_QTY = 430;
const COL_TOTAL = 470;
const TOTALS_LABEL = 360;
const PAGE_BOTTOM = 770;

function formatAmount(value: string, currency: string): string {
  const numeric = Number(value);
  const formatted = Number.isFinite(numeric)
    ? new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numeric)
    : value;
  return currency === 'INR' ? `Rs. ${formatted}` : `${currency} ${formatted}`;
}

function formatIssueDate(value: string): { date: string; time: string } {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { date: value, time: '' };
  }
  const zone = 'Asia/Kolkata';
  return {
    date: new Intl.DateTimeFormat('en-IN', { timeZone: zone, day: '2-digit', month: 'short', year: 'numeric' }).format(
      date,
    ),
    time: new Intl.DateTimeFormat('en-IN', { timeZone: zone, hour: 'numeric', minute: '2-digit', hour12: true }).format(
      date,
    ),
  };
}

function isNonZero(value: string): boolean {
  const numeric = Number(value);
  return Number.isFinite(numeric) && Math.abs(numeric) >= 0.005;
}

/** A4 invoice PDF (Jerzyfy invoice design) for WhatsApp / download. */
export function renderInvoicePdf(invoice: InvoiceDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 48, bottom: 40, left: MARGIN_X, right: MARGIN_X },
      info: { Title: `Invoice ${invoice.invoiceNumber}`, Author: invoice.business.name },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const amount = (value: string): string => formatAmount(value, invoice.currency);
    const contentWidth = CONTENT_RIGHT - MARGIN_X;

    // Header
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(16);
    doc.text(invoice.business.name, MARGIN_X, 48, { width: contentWidth, align: 'center' });
    const businessLines = [invoice.business.addressLine, invoice.business.contactLine].filter(Boolean) as string[];
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED);
    for (const line of businessLines) {
      doc.text(line, MARGIN_X, doc.y + 2, { width: contentWidth, align: 'center' });
    }

    // INVOICE title flanked by accent rules
    const titleY = Math.max(doc.y + 14, 92);
    doc.font('Helvetica-Bold').fontSize(34).fillColor(INK);
    const titleWidth = doc.widthOfString('INVOICE');
    const titleX = (PAGE_WIDTH - titleWidth) / 2;
    doc.text('INVOICE', titleX, titleY, { lineBreak: false });
    const ruleY = titleY + 14;
    doc
      .save()
      .lineWidth(3)
      .strokeColor(ACCENT)
      .moveTo(0, ruleY)
      .lineTo(titleX - 16, ruleY)
      .stroke()
      .moveTo(titleX + titleWidth + 16, ruleY)
      .lineTo(PAGE_WIDTH, ruleY)
      .stroke()
      .restore();

    // Bill to (left) + invoice meta (right)
    const blockY = titleY + 70;
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text('BILL TO:', COL_DESC, blockY);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(invoice.billTo.name, COL_DESC, doc.y + 3, {
      width: 250,
    });
    doc.font('Helvetica').fontSize(9).fillColor(MUTED);
    for (const line of [...invoice.billTo.addressLines, invoice.billTo.phone].filter(Boolean) as string[]) {
      doc.text(line, COL_DESC, doc.y + 3, { width: 250 });
    }
    const leftBottom = doc.y;

    const issued = formatIssueDate(invoice.issuedAt);
    const meta: Array<[string, string]> = [
      ['Invoice #:', invoice.invoiceNumber],
      ['Issue Date:', issued.date],
    ];
    if (issued.time) {
      meta.push(['Time:', issued.time]);
    }
    if (invoice.reference) {
      const [label, ...rest] = invoice.reference.split(': ');
      meta.push(rest.length ? [`${label}:`, rest.join(': ')] : ['Ref:', invoice.reference]);
    }
    let metaY = blockY + 16;
    for (const [label, value] of meta) {
      doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(label, TOTALS_LABEL, metaY, { width: 80 });
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(INK).text(value, 430, metaY - 0.5, {
        width: CONTENT_RIGHT - 8 - 430,
        align: 'right',
      });
      metaY += 15;
    }

    // Items table
    let y = Math.max(leftBottom, metaY) + 36;
    const drawTableHeader = (): void => {
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(INK);
      doc.text('Description', COL_DESC, y);
      doc.text('Price', COL_PRICE, y, { width: 60, align: 'right' });
      doc.text('QTY', COL_QTY, y, { width: 30, align: 'center' });
      doc.text('Total', COL_TOTAL, y, { width: CONTENT_RIGHT - COL_TOTAL - 8, align: 'right' });
      y += 17;
      doc.save().lineWidth(0.8).strokeColor(RULE).moveTo(MARGIN_X, y).lineTo(CONTENT_RIGHT, y).stroke().restore();
      y += 14;
    };
    drawTableHeader();

    for (const line of invoice.lines) {
      doc.font('Helvetica').fontSize(10);
      const descHeight = doc.heightOfString(line.description, { width: COL_PRICE - COL_DESC - 16 });
      const rowHeight = descHeight + (line.detail ? 12 : 0) + 16;
      if (y + rowHeight > PAGE_BOTTOM) {
        doc.addPage();
        y = 60;
        drawTableHeader();
      }
      doc.fillColor(INK).text(line.description, COL_DESC, y, { width: COL_PRICE - COL_DESC - 16 });
      if (line.detail) {
        doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(line.detail, COL_DESC, y + descHeight + 2, {
          width: COL_PRICE - COL_DESC - 16,
          lineBreak: false,
          ellipsis: true,
        });
      }
      doc.font('Helvetica').fontSize(10).fillColor(INK);
      doc.text(amount(line.unitPrice), COL_PRICE - 20, y, { width: 80, align: 'right' });
      doc.text(String(line.quantity), COL_QTY, y, { width: 30, align: 'center' });
      doc.text(amount(line.total), COL_TOTAL - 20, y, { width: CONTENT_RIGHT - COL_TOTAL + 12, align: 'right' });
      y += rowHeight;
    }
    doc.save().lineWidth(0.8).strokeColor(RULE).moveTo(MARGIN_X, y).lineTo(CONTENT_RIGHT, y).stroke().restore();

    // Totals (right)
    const totals: Array<[string, string]> = [['Subtotal', invoice.subtotal]];
    if (isNonZero(invoice.discount)) {
      totals.push(['Discount', `-${invoice.discount}`]);
    }
    if (isNonZero(invoice.shipping)) {
      totals.push(['Shipping', invoice.shipping]);
    }
    totals.push([invoice.taxInclusive ? 'Tax (incl.)' : 'Tax', invoice.tax]);
    if (y + 60 + totals.length * 34 > PAGE_BOTTOM) {
      doc.addPage();
      y = 60;
    }
    let totalsY = y + 20;
    const sectionTop = totalsY;
    for (const [label, value] of totals) {
      doc.font('Helvetica').fontSize(10).fillColor(INK).text(label, TOTALS_LABEL, totalsY);
      const shown = value.startsWith('-') ? `-${amount(value.slice(1))}` : amount(value);
      doc.text(shown, COL_TOTAL - 20, totalsY, { width: CONTENT_RIGHT - COL_TOTAL + 12, align: 'right' });
      totalsY += 17;
      doc
        .save()
        .lineWidth(0.8)
        .strokeColor(RULE)
        .moveTo(TOTALS_LABEL, totalsY)
        .lineTo(CONTENT_RIGHT, totalsY)
        .stroke()
        .restore();
      totalsY += 14;
    }
    doc
      .save()
      .lineWidth(2)
      .strokeColor('#bdbdbd')
      .moveTo(TOTALS_LABEL, totalsY - 13)
      .lineTo(CONTENT_RIGHT, totalsY - 13)
      .stroke()
      .restore();
    doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text('Total Due', TOTALS_LABEL, totalsY);
    doc.text(amount(invoice.total), COL_TOTAL - 40, totalsY, { width: CONTENT_RIGHT - COL_TOTAL + 32, align: 'right' });

    // Payment + notes (left)
    let leftY = sectionTop + 56;
    if (invoice.payments.length) {
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(INK).text('Payment:', COL_DESC, leftY);
      leftY = doc.y + 6;
      doc.font('Helvetica').fontSize(9).fillColor(MUTED);
      for (const payment of invoice.payments) {
        doc.text(payment.replace(/\b(\d[\d,]*\.\d{2})\b/g, (match) => amount(match)), COL_DESC, leftY, {
          width: 260,
        });
        leftY = doc.y + 4;
      }
      leftY += 12;
    }
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(INK).text('Notes:', COL_DESC, leftY);
    leftY = doc.y + 6;
    doc.font('Helvetica').fontSize(9).fillColor(MUTED);
    for (const note of invoice.notes) {
      doc.text(note, COL_DESC, leftY, { width: 260 });
      leftY = doc.y + 4;
    }

    doc.end();
  });
}
