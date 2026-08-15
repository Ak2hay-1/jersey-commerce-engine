import { renderReceiptHtml, type ReceiptPayload } from './receipt-format';

const payload: ReceiptPayload = {
  business: {
    name: 'Demo Jersey Store',
    logo: null,
    address: 'MG Road',
    phone: '9999999999',
    email: 'shop@example.invalid',
    city: 'Bengaluru',
    state: 'KA',
    postalCode: '560001',
    country: 'IN',
    currency: 'INR',
  },
  transaction: {
    saleId: 'sale_1',
    invoiceNumber: 'INV-000001',
    datetime: '2026-08-15T12:00:00.000Z',
    cashierName: 'Neha Patel',
    posSessionId: 'session_1',
    status: 'COMPLETED',
    customerName: null,
    customerPhone: null,
  },
  items: [
    {
      productName: 'India Cricket Jersey',
      variant: 'L / Blue',
      sku: 'IND-JER-L',
      quantity: 1,
      unitPrice: '899.00',
      discount: '0.00',
      tax: '0.00',
      lineTotal: '899.00',
    },
  ],
  totals: {
    subtotal: '899.00',
    discount: '0.00',
    discountType: 'NONE',
    discountValue: '0.00',
    tax: '0.00',
    taxInclusive: true,
    total: '899.00',
  },
  payments: [
    {
      method: 'CASH',
      amount: '899.00',
      amountReceived: '1000.00',
      changeDue: '101.00',
      reference: null,
      provider: 'CASH_DRAWER',
    },
  ],
  barcode: 'INV-000001',
};

describe('thermal receipt html', () => {
  it('renders a narrow 80mm layout with totals and cash tender', () => {
    const html = renderReceiptHtml(payload, 'thermal');
    expect(html).toContain('80mm');
    expect(html).toContain('INV-000001');
    expect(html).toContain('TOTAL');
    expect(html).toContain('Recv 1000.00');
    expect(html).toContain('Chg 101.00');
    expect(html).not.toContain('<img');
  });
});
