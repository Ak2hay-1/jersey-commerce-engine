# Sales

This document describes the POS sale lifecycle for the Jersey Commerce Engine. Storefront checkout is not part of this phase.

## Lifecycle

```text
ACTIVE cart
    → payment capture (cash / cashier-confirmed UPI or card)
    → COMPLETED sale
         → PARTIALLY_REFUNDED
         → REFUNDED
    or   → CANCELLED
```

A completed sale is never deleted. Cancellations and refunds are additional records. Invoice numbers are never reused.

Sale completion is a single database transaction:

1. Validate the active cart, cashier session, and catalog status.
2. Re-read selling prices and snapshot them onto sale items.
3. Calculate subtotal, line discounts, cart discount, configurable tax, and payable total.
4. Validate that captured payments equal that total.
5. Allocate the next tenant invoice number under a row lock.
6. Insert the sale, sale items, and payment rows.
7. Decrease inventory and write `SALE` movements.
8. Update POS session cash / UPI / card counters.
9. Write an audit log.
10. Store a frozen receipt payload.

If any step fails, the transaction rolls back. No partial sale, payment, or stock movement remains.

## Price snapshot

Each `SaleItem` stores the product name, SKU, size, colour, unit selling price, cost price, discount inputs, discount amount, tax rate, tax amount, and line total at the time of the sale.

Later catalog price or name edits do not rewrite historical sales.

## Discounts

Line discounts and cart discounts support `PERCENTAGE` and `FIXED`. Both the input (`discountType` + `discountValue`) and the computed rupee amount are stored so a receipt can explain the total:

```text
Subtotal     ₹2,000.00
Discount 10%   ₹200.00
Tax (incl.)    ₹180.00
Total        ₹1,980.00
```

Cart discount is allocated across lines so item totals still add up to the sale total.

Cashiers need `sales.discount` to apply discounts. This phase does not load per-role maximum discount caps from tenant settings.

## Tax

Tax is configurable, not a hard-coded GST schedule:

- Tenant defaults: `defaultTaxRate`, `taxInclusivePricing`.
- Variant overrides: `taxRate`, `taxInclusive` (null inherits the tenant).
- Sale and sale item rows snapshot the rates used.

Inclusive pricing extracts tax from the payable amount. Exclusive pricing adds tax. This is a calculation foundation only and is not a claim of GST or legal compliance.

## Invoice numbering

`DocumentSequence` (`documentType = SALE_INVOICE`) is tenant-scoped.

Default pattern: `INV-000001`, `INV-000002`, …

- Generated only on the server under `SELECT … FOR UPDATE`.
- Prefix, next number, and pad length are stored on the sequence row.
- Cancelled invoices keep their number; the sequence still advances.

## Permissions

| Permission | Typical roles |
| --- | --- |
| `sales.read` | Owner, manager, cashier, inventory manager |
| `sales.create` | Owner, manager, cashier |
| `sales.cancel` | Owner, manager |
| `sales.refund` | Owner, manager, cashier |
| `sales.discount` | Owner, manager |

Website managers have no POS sale operations.

## Endpoints

- `POST /api/v1/pos/sales/complete`
- `GET /api/v1/pos/sales`
- `GET /api/v1/pos/sales/:id`
- `POST /api/v1/pos/sales/:id/cancel`
- `POST /api/v1/pos/sales/:id/refund`
- `GET /api/v1/pos/sales/:id/receipt`

Sale list filters: date range, cashier, POS session, invoice number, customer, payment method, status, min/max amount, pagination, sort.
