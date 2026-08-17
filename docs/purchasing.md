# Purchasing

Phase 8 of the Jersey Commerce Engine. Supplier records are documented in [suppliers.md](suppliers.md). Inventory changes always go through `InventoryService` from Phase 4. This phase does **not** implement a purchase-return UI or FIFO/LIFO costing.

## Purchase lifecycle

```text
DRAFT → ORDERED → PARTIALLY_RECEIVED → RECEIVED
   \         \
    \         → CANCELLED (nothing received)
     → CANCELLED
```

| Status | Inventory | Payable | Notes |
| --- | --- | --- | --- |
| `DRAFT` | Unchanged | No | Editable. Number already allocated (`PO-000001`). |
| `ORDERED` | Unchanged | Yes | Sent to the supplier. Goods are not yet on hand. |
| `PARTIALLY_RECEIVED` | Increased for received qty | Yes | Further receipts are allowed against remaining quantity. |
| `RECEIVED` | Increased for full ordered qty | Yes | Cannot be cancelled. |
| `CANCELLED` | Unchanged | No | Requires a reason. History is preserved. |

Creating a purchase never increases inventory. Only a receive operation does.

## Purchase number

Numbers are allocated server-side from `DocumentSequence` (`documentType = PURCHASE_ORDER`, default prefix `PO`, pad length 6). Allocation takes a row lock, so concurrent creates cannot share a number. The prefix is stored on the sequence row so a later settings phase can change it per tenant without a code change. The frontend must not send a purchase number.

## Line items

Each `PurchaseItem` references a `ProductVariant` in the same tenant.

| Field | Meaning |
| --- | --- |
| `orderedQuantity` | Quantity on the purchase order |
| `receivedQuantity` | Cumulative quantity physically received |
| `unitCost` | Negotiated supplier cost at order time |
| `discount` / `tax` / `total` | Captured on the line. Not recalculated from later catalog prices. |

The current variant selling price and `costPrice` are **not** used when creating a purchase. `ProductVariant.costPrice` is updated on receive only when `Tenant.updateVariantCostOnReceive` is true (default `false`).

## Receiving

`POST /api/v1/purchases/:id/receive` accepts one or more lines:

```json
{
  "productVariantId": "...",
  "receivedQuantity": 60,
  "notes": "First delivery"
}
```

Rules:

- received quantity must be a positive integer
- received quantity cannot exceed remaining ordered quantity unless `Tenant.allowPurchaseOverReceive` is true (default `false`)
- cancelled and draft purchases cannot be received
- multiple receive operations against the same purchase are allowed

Example: order 100, receive 60 → `PARTIALLY_RECEIVED` and inventory +60. Receive 40 later → `RECEIVED` and inventory +40.

The receive transaction is atomic:

1. lock the purchase row
2. validate remaining quantities
3. insert `PurchaseReceipt` / `PurchaseReceiptItem` (cost layer: unit cost, quantity, date, supplier)
4. update `PurchaseItem.receivedQuantity`
5. call `InventoryService.applyPurchase` (`type = PURCHASE`, positive quantity, `referenceType = PURCHASE`, `referenceId = purchase id`, movement `unitCost` = negotiated purchase cost)
6. write the audit log (user, purchase, variant, quantity, previous/new received quantity)

If any step fails, inventory, purchase items, receipts, and audit rows are rolled back.

## Supplier payments

`SupplierPayment` is accounts payable. It is not the customer `Payment` ledger.

Methods: `CASH`, `UPI`, `CARD`, `BANK_TRANSFER`, `OTHER`. No PAN, UPI PIN, or account numbers are stored.

Validation:

- amount > 0
- supplier belongs to the tenant
- when `purchaseId` is set, the purchase belongs to that supplier
- cancelled and draft purchases cannot be paid
- amount cannot exceed outstanding unless `Tenant.allowSupplierOverpay` is true (default `false`)

Outstanding for one purchase is `purchase.total - completed payments on that purchase`. Outstanding for a supplier is payable purchase totals minus all completed payments for that supplier.

## Cancellation

| Current status | Cancel allowed? |
| --- | --- |
| `DRAFT` | Yes, with reason |
| `ORDERED` with nothing received and no payments | Yes, with reason |
| `PARTIALLY_RECEIVED` | No. Preserve history; correct with a future purchase return or inventory adjustment. |
| `RECEIVED` | No |

## Purchase returns (not implemented)

A future purchase-return workflow can reference:

- supplier
- original purchase
- product variant
- quantity
- preserved unit cost from `PurchaseReceiptItem` / `PurchaseItem`
- reason

Inventory would decrease through `InventoryService` in the same transaction. This phase only preserves the cost/quantity/supplier/date data that costing and returns will need. There is no return endpoint yet.

## Costing preparation

Each receipt stores unit cost, quantity, timestamp, and supplier on `PurchaseReceiptItem`. Inventory movements store the same unit cost. Average cost, FIFO, stock valuation, and profitability are **not** implemented here.

## Reports

| Path | Permission | Content |
| --- | --- | --- |
| `GET /api/v1/reports/purchases-summary` | `purchases.read` | Totals, quantities, costs, by status |
| `GET /api/v1/reports/supplier-balances` | `purchases.read` | Per-supplier payable / paid / outstanding |
| `GET /api/v1/reports/top-suppliers` | `purchases.read` | Ranked by total, outstanding, or quantity |

Date filters and pagination apply where lists are returned.

## Permissions

| Permission | Typical use |
| --- | --- |
| `purchases.read` | List and detail |
| `purchases.create` | Create draft |
| `purchases.update` | Edit draft, mark ordered |
| `purchases.receive` | Receive goods |
| `purchases.cancel` | Cancel draft/unordered |
| `supplierPayments.read` | Payment history |
| `supplierPayments.create` | Record a supplier payment |

OWNER and MANAGER have the full set. INVENTORY_MANAGER has suppliers, purchases, receiving, and supplier payments. CASHIER and WEBSITE_MANAGER do not.

## API

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/api/v1/purchases` | `purchases.read` |
| GET | `/api/v1/purchases/:id` | `purchases.read` |
| POST | `/api/v1/purchases` | `purchases.create` |
| PATCH | `/api/v1/purchases/:id` | `purchases.update` |
| POST | `/api/v1/purchases/:id/order` | `purchases.update` |
| POST | `/api/v1/purchases/:id/receive` | `purchases.receive` |
| POST | `/api/v1/purchases/:id/cancel` | `purchases.cancel` |
| GET | `/api/v1/supplier-payments` | `supplierPayments.read` |
| POST | `/api/v1/supplier-payments` | `supplierPayments.create` |
