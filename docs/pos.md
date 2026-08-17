# POS engine

Phase 5 adds a backend Point of Sale workflow on the existing NestJS API. Cashiers open a register session, build a cart from the catalog, take in-person payment, and complete a sale. Inventory is changed only when the sale commits, and only by calling `InventoryService` from Phase 4.

This phase does **not** include a POS screen, thermal printing, a payment gateway, ecommerce checkout, or refunds beyond cancelling a completed sale.

## Architecture

```text
Cashier API
    │
    ▼
PosSessionService   open / close float (not revenue)
PosCartService      working cart; no stock reservation
PosLookupService    name / SKU / barcode via ProductsService
PosSaleService      one PostgreSQL transaction
    │
    ├─ InventoryService.applySale / applyReturn   (row lock)
    ├─ InvoiceService                             (tenant sequence lock)
    ├─ Payment rows                               (CASH / UPI / CARD / OTHER)
    └─ AuditService
```

POS reuses:

- JWT authentication and tenant context
- RBAC (`pos.*`, `sales.*`)
- Product + variant catalog
- Inventory on-hand / reserved / movements
- `Customer` and `Payment` tables

It does not introduce a second catalog or a second stock ledger.

## Session lifecycle

Statuses: `OPEN`, `CLOSED`.

1. `POST /api/v1/pos/sessions/open` records **opening cash** as till float. Opening cash is never sales revenue.
2. A cashier may have only one `OPEN` session (enforced in application code and by a partial unique index).
3. `GET /api/v1/pos/sessions/current` returns that session.
4. `GET /api/v1/pos/sessions` lists the caller’s sessions. Owners and managers see the whole tenant.
5. `POST /api/v1/pos/sessions/:id/close` stores **closing cash** and freezes totals. Held carts or a non-empty active cart must be cleared first.

Expected cash (physical drawer):

```text
expectedCash = openingCash + cashSales − cashRefunds
```

UPI, card, and other tender are tracked on the session but are **not** mixed into expected cash.

## Cart lifecycle

A cart belongs to a tenant and a POS session.

Statuses: `ACTIVE`, `HELD`, `COMPLETED`, `CANCELLED`.

- One `ACTIVE` cart per session (partial unique index).
- Adding a line **snapshots** the variant’s selling price. Clients cannot submit a selling price.
- Line and cart discounts: `FIXED` or `PERCENTAGE`. Negative values are rejected. Percentages must be 0–100. A discount cannot exceed the amount it applies to.
- Cart mutations do **not** reserve or reduce inventory.
- `POST /api/v1/pos/carts/:id/hold` parks a cart (still no inventory hold).
- `POST /api/v1/pos/carts/:id/resume` makes it active again and parks any other active cart in the same session.
- Walk-in sales use `customerId = null`. Existing or newly created customers are optional.

## Sale lifecycle

`POST /api/v1/pos/sales/complete` runs inside one PostgreSQL transaction (`ReadCommitted` plus `SELECT … FOR UPDATE`):

1. Authenticated cashier with `sales.create` and an `OPEN` session
2. Lock session and active cart
3. Re-load variants, confirm they are tenant-owned, product `ACTIVE`, variant `ACTIVE`
4. Replace line unit prices with the **current** catalog selling price (snapshot is display-only; catalog wins)
5. Recompute discounts
6. Validate payments (sum must equal total)
7. Allocate `INV-000001` from `document_sequences` under row lock
8. Insert `Sale`, `SaleItem`, `Payment`
9. `InventoryService.applySale` (on-hand decreases, `SALE` movement, reference = sale / invoice)
10. Update session tender totals and expected cash
11. Mark cart `COMPLETED`
12. Audit `pos.sale.completed`

If any step throws, the transaction rolls back: no sale, no payment, no inventory movement, sequence unused.

Sale statuses: `COMPLETED`, `CANCELLED`, `VOIDED` (legacy), `REFUNDED`, `PARTIALLY_REFUNDED`. Completed sales are never deleted.

`POST /api/v1/pos/sales/:id/cancel` (permission `sales.cancel`):

- Requires a `COMPLETED` sale
- Restocks via `InventoryService.applyReturn`
- Records `cancelReason` / `cancelledAt` / `cancelledBy`
- Increases session `cashRefunds` for cash tender (does not rewrite original sale amounts)
- Logs denied attempts when a cashier calls cancel

Full refund settlement belongs to Phase 6.

## Inventory integration

POS never writes `inventories` rows itself. Completing a sale calls `InventoryService.applySale`; cancellation calls `applyReturn`. Those methods lock `inventories` with `FOR UPDATE`, update on-hand/reserved/available together, and append `inventory_movements`.

Example:

```text
India Jersey L × 2
40 → 38
movement SALE  −2
referenceType SALE, referenceId = sale id, reason = invoice number
```

## Concurrency

Two cashiers completing overlapping carts for the last unit:

1. Variant ids are locked in sorted order inside the sale transaction
2. The second transaction waits, then sees available = 0
3. `InventoryService` throws `ConflictException` (`409`)
4. Only one sale commits

Frontend stock values are ignored at completion.

## Payments (Phase 5 preparation)

Accepted methods: `CASH`, `UPI`, `CARD`, `OTHER`.

- Cash: `amountReceived` is required and must be ≥ the applied amount. `changeDue = amountReceived − amount` and cannot be negative. Drawer cash increases by the **sale amount**, not by the tendered note.
- UPI / CARD / OTHER: recorded as `COMPLETED` for in-person confirmation. No gateway is called.
- `ONLINE` is rejected. The API does not fake a successful online capture.

## Invoice numbering

`document_sequences` (`documentType = SALE_INVOICE`) stores `prefix` (default `INV`), `nextNumber`, and `padLength` (default 6). Allocation is `SELECT … FOR UPDATE` then increment, so concurrent sales in the same tenant cannot share a number. Numbers are unique per tenant (`sales (tenant_id, invoice_number)`). Prefixes are data, not hard-coded in the sale service, so tenants can later configure them.

## Permissions

| Permission | OWNER | MANAGER | CASHIER | INVENTORY_MANAGER | WEBSITE_MANAGER |
| --- | --- | --- | --- | --- | --- |
| `pos.access` | yes | yes | yes | no | no |
| `pos.session.open` / `close` | yes | yes | yes | no | no |
| `sales.read` / `sales.create` | yes | yes | yes | no | no |
| `sales.discount` | yes | yes | **no by default** (configurable later) | no | no |
| `sales.cancel` | yes | yes | no | no | no |
| `sales.refund` | yes | yes | yes | no | no |

Maximum discount-per-role is not hard-coded. `assertDiscountPermission` is the hook for future tenant/role caps.

Cashiers see their own sessions, carts, and sales. Owners and managers see the tenant.

## Audit

Logged (no passwords, tokens, or raw payment credentials):

- session opened / closed
- cart held / resumed
- discount applied
- catalog price revalidated at completion
- sale completed
- sale cancelled
- unauthorized cancel attempts

## Endpoints

| Method | Path |
| --- | --- |
| POST | `/api/v1/pos/sessions/open` |
| GET | `/api/v1/pos/sessions/current` |
| GET | `/api/v1/pos/sessions` |
| POST | `/api/v1/pos/sessions/:id/close` |
| POST | `/api/v1/pos/cart` |
| GET | `/api/v1/pos/cart` |
| PATCH | `/api/v1/pos/cart` |
| DELETE | `/api/v1/pos/cart` |
| POST | `/api/v1/pos/cart/items` |
| PATCH | `/api/v1/pos/cart/items/:id` |
| DELETE | `/api/v1/pos/cart/items/:id` |
| POST | `/api/v1/pos/carts/:id/hold` |
| POST | `/api/v1/pos/carts/:id/resume` |
| GET | `/api/v1/pos/carts/held` |
| GET | `/api/v1/pos/products` |
| GET | `/api/v1/pos/products/barcode/:barcode` |
| GET | `/api/v1/pos/customers` |
| POST | `/api/v1/pos/sales/complete` |
| GET | `/api/v1/pos/sales` |
| GET | `/api/v1/pos/sales/:id` |
| POST | `/api/v1/pos/sales/:id/cancel` |

Lookup uses `ProductsService.lookupVariantsForPos` (name / SKU / barcode). Exact barcodes use the unique `(tenant_id, barcode)` index. Customer lookup is `GET /api/v1/pos/customers?search=` (name, phone, or email). Walk-in sales omit `customerId`. See [customers.md](customers.md).

POS sessions are stored in PostgreSQL. Redis is used for auth rate limits and token denylist, not for POS carts.
