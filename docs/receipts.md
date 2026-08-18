# Receipts

Receipts are generated from frozen sale data. A printer is never required to complete a sale. If HTML rendering later fails, the sale and payments are unchanged.

## Structured payload

At sale completion the API stores `Sale.receiptPayload` with:

- Business name, optional logo URL, address, phone, email
- Invoice number, timestamp, cashier, POS session, customer
- Lines: product, variant, SKU, quantity, unit price, discount, tax, line total
- Totals: subtotal, discount (type + value + amount), tax, payable total
- Payments, including cash received and change

The payload uses sale-item snapshots, so later catalog or tenant branding edits do not rewrite a past receipt. If the JSON was not stored, `GET` rebuilds it from those snapshots plus current tenant contact fields as a fallback.

## Generation

`ReceiptService` exposes:

| `format` | Result |
| --- | --- |
| `json` | Structured receipt |
| `html` | Printable HTML |
| `thermal` | 80mm-oriented HTML |
| `pdf` | Prepared, not rendered in this phase |
| `email` | Prepared, not sent in this phase |

Endpoint: `GET /api/v1/pos/sales/:id/receipt?format=thermal`

## Thermal layout

The 80mm layout uses a ~72mm content width, monospace type, dashed rules, compact totals, cash tender/change, the invoice number as a barcode stand-in, and an empty QR placeholder. Large images are not embedded; a logo URL is omitted from the thermal HTML unless a tenant supplies one, and even then it is not required to complete a sale.
