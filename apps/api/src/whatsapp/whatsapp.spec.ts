import { signInvoiceToken, verifyInvoiceToken } from './invoice-link.service';
import { buildMsg91ReceiptPayload, toWhatsappIndia } from './msg91-whatsapp.client';
import { invoiceFromOrder, invoiceFromSalePayload } from '../receipts/invoice-document';
import { renderInvoicePdf } from '../receipts/invoice-pdf';
import type { ReceiptPayload } from '../receipts/receipt-format';

const money = (value: string) => ({ toFixed: (digits: number) => Number(value).toFixed(digits) });

const salePayload: ReceiptPayload = {
  business: {
    name: 'Jerzyfy',
    logo: null,
    address: 'Ravet Main Road',
    phone: '9999999999',
    email: null,
    city: 'Pune',
    state: 'MH',
    postalCode: '412101',
    country: 'IN',
    currency: 'INR',
  },
  transaction: {
    saleId: 'sale_1',
    invoiceNumber: 'INV-000123',
    datetime: '2026-09-27T10:00:00.000Z',
    cashierName: 'Neha',
    posSessionId: null,
    status: 'COMPLETED',
    customerName: 'Rahul',
    customerPhone: '9123456780',
  },
  items: [
    {
      productName: 'Real Madrid Third',
      variant: 'L',
      sku: 'RM-3RD-L',
      quantity: 1,
      unitPrice: '1499.00',
      discount: '0.00',
      tax: '0.00',
      lineTotal: '1499.00',
    },
  ],
  totals: {
    subtotal: '1499.00',
    discount: '0.00',
    discountType: 'NONE',
    discountValue: '0.00',
    tax: '0.00',
    taxInclusive: true,
    total: '1499.00',
  },
  payments: [
    { method: 'CASH', amount: '1499.00', amountReceived: '1500.00', changeDue: '1.00', reference: null, provider: null },
  ],
  barcode: 'INV-000123',
};

describe('invoice links', () => {
  const secret = 'test-secret-key-that-is-long-enough';

  it('signs and verifies a token', () => {
    const token = signInvoiceToken({ t: 'tenant', k: 'SALE', id: 'sale_1', exp: 2_000 }, secret);
    expect(verifyInvoiceToken(token, secret, 1_000)).toEqual({ t: 'tenant', k: 'SALE', id: 'sale_1', exp: 2_000 });
  });

  it('rejects expired, tampered, or wrongly signed tokens', () => {
    const token = signInvoiceToken({ t: 'tenant', k: 'ORDER', id: 'order_1', exp: 2_000 }, secret);
    expect(verifyInvoiceToken(token, secret, 2_001)).toBeNull();
    expect(verifyInvoiceToken(token, 'other-secret', 1_000)).toBeNull();
    const [, signature] = token.split('.');
    const forged = `${Buffer.from(JSON.stringify({ t: 'tenant', k: 'ORDER', id: 'order_2', exp: 2_000 })).toString('base64url')}.${signature}`;
    expect(verifyInvoiceToken(forged, secret, 1_000)).toBeNull();
    expect(verifyInvoiceToken('garbage', secret, 1_000)).toBeNull();
  });
});

describe('MSG91 WhatsApp payload', () => {
  it('normalises Indian phone numbers', () => {
    expect(toWhatsappIndia('98765 43210')).toBe('919876543210');
    expect(toWhatsappIndia('+91 98765-43210')).toBe('919876543210');
    expect(toWhatsappIndia('09876543210')).toBe('919876543210');
    expect(toWhatsappIndia('12345')).toBeNull();
  });

  it('builds the template payload with a document header', () => {
    const body = buildMsg91ReceiptPayload({
      integratedNumber: '919000000000',
      templateName: 'jerzyfy_receipt',
      namespace: 'ns_1',
      language: 'en',
      to: '919876543210',
      documentUrl: 'https://api.example.com/api/v1/public/invoices/abc.pdf',
      documentFilename: 'INV-000123.pdf',
      customerName: 'Rahul',
      billNumber: 'INV-000123',
      total: '1,499.00',
    });
    expect(body).toMatchObject({
      integrated_number: '919000000000',
      content_type: 'template',
      payload: {
        messaging_product: 'whatsapp',
        type: 'template',
        template: {
          name: 'jerzyfy_receipt',
          namespace: 'ns_1',
          language: { code: 'en', policy: 'deterministic' },
          to_and_components: [
            {
              to: ['919876543210'],
              components: {
                header_1: {
                  type: 'document',
                  value: 'https://api.example.com/api/v1/public/invoices/abc.pdf',
                  filename: 'INV-000123.pdf',
                },
                body_1: { type: 'text', value: 'Rahul' },
                body_2: { type: 'text', value: 'INV-000123' },
                body_3: { type: 'text', value: '1,499.00' },
              },
            },
          ],
        },
      },
    });
  });
});

describe('invoice PDF', () => {
  it('renders a POS sale invoice', async () => {
    const doc = invoiceFromSalePayload(salePayload);
    expect(doc.billTo.name).toBe('Rahul');
    expect(doc.lines[0]?.description).toBe('Real Madrid Third · L');
    const pdf = await renderInvoicePdf(doc);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('renders a website order invoice with shipping address', async () => {
    const doc = invoiceFromOrder({
      orderNumber: 'ORD-000016',
      createdAt: new Date('2026-09-27T10:00:00.000Z'),
      currency: 'INR',
      subtotal: money('1499'),
      discount: money('0'),
      shippingAmount: money('99'),
      tax: money('0'),
      total: money('1598'),
      paymentStatus: 'COMPLETED',
      tenant: {
        name: 'Jerzyfy',
        address: null,
        city: 'Pune',
        state: 'MH',
        postalCode: '412101',
        contactPhone: null,
        contactEmail: null,
      },
      customer: { name: 'Akshay', phone: '9000000000' },
      shippingAddress: {
        fullName: 'Akshay K',
        phone: '9123456780',
        addressLine1: 'Flat 2',
        addressLine2: null,
        city: 'Pune',
        state: 'MH',
        postalCode: '412101',
      },
      items: [
        {
          productNameSnapshot: 'Real Madrid Third',
          skuSnapshot: 'RM-3RD-L',
          sizeSnapshot: 'L',
          colorSnapshot: null,
          quantity: 1,
          unitPrice: money('1499'),
          total: money('1499'),
          taxInclusive: true,
        },
      ],
      payments: [{ method: 'ONLINE', status: 'COMPLETED', amount: money('1598'), reference: 'pay_1' }],
    });
    expect(doc.billTo.phone).toBe('9123456780');
    expect(doc.shipping).toBe('99.00');
    expect(doc.payments[0]).toContain('Paid');
    const pdf = await renderInvoicePdf(doc);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
