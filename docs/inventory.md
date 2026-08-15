# Inventory engine

Phase 4 of the Jersey Commerce Engine. POS (Phase 5) completes sales by calling `InventoryService.applySale` / `applyReturn`. Purchasing (Phase 8) receives goods by calling `InventoryService.applyPurchase`. Ecommerce checkout must use the same service instead of writing inventory rows directly.

## Inventory model

Stock is tracked **per product variant**, never only at product level.

Example: India Jersey S/M/L/XL each have their own `Inventory` row.

| Field | Meaning |
| --- | --- |
| `quantity` | Units on hand |
| `reservedQuantity` | Units held for unfulfilled orders |
| `availableQuantity` | `quantity - reservedQuantity` |
| `reorderLevel` | Per-variant threshold, not a hard-coded constant |

PostgreSQL check constraints enforce:

- quantity ≥ 0
- reserved ≥ 0
- reserved ≤ quantity
- available = quantity − reserved
- available ≥ 0

## Stock ledger

`InventoryMovement` is append-only. Every on-hand quantity change creates exactly one movement. Historical rows are never updated or deleted. Corrections use compensating movements (adjustment, return, cancelled order).

Quantity sign:

- positive = stock added (`PURCHASE +50`)
- negative = stock removed (`SALE -2`, `DAMAGE -1`)

Types: `OPENING_STOCK`, `PURCHASE`, `SALE`, `ONLINE_ORDER`, `RETURN`, `EXCHANGE`, `DAMAGE`, `ADJUSTMENT`, `TRANSFER_IN`, `TRANSFER_OUT`, `CANCELLED_ORDER`.

`unitCost` stores the variant cost **at movement time**. Changing the catalog cost later does not rewrite movements. Current valuation for reports is `quantity × current costPrice`. FIFO/LIFO is not implemented.

Reservation and release change `reservedQuantity` only. They write an audit log, not a quantity movement, because on-hand stock does not change. Completing a reserved order uses `consumeReservedStock()` which decreases both `quantity` and `reservedQuantity` and writes the sale/online-order movement.

## Reservation

| State | quantity | reserved | available |
| --- | ---: | ---: | ---: |
| Start | 10 | 0 | 10 |
| Reserve 2 | 10 | 2 | 8 |
| Cancel / release 2 | 10 | 0 | 10 |
| Consume reserved 2 (sale) | 8 | 0 | 8 |

Reserved quantity cannot exceed on-hand quantity. Available stock cannot go negative.

## Adjustment and opening stock

- `inventory.adjust` may create opening stock (once per variant, from zero) or a signed adjustment.
- Damage is an adjustment with type `DAMAGE` and a **negative** quantity.
- A non-empty reason is required.
- Tenant isolation, permission checks, inventory update, movement, and audit log happen in one database transaction.

Archived products / inactive variants cannot receive new sales stock or reservations until reactivated. Physical corrections (`ADJUSTMENT`, `DAMAGE`, reservation release) remain allowed so leftover stock can be explained.

## Low stock

Status is computed from **on-hand quantity**, not selling price:

- `quantity = 0` → `OUT_OF_STOCK`
- `reorderLevel > 0` and `0 < quantity ≤ reorderLevel` → `LOW_STOCK`
- otherwise → `IN_STOCK`

Reorder level is configurable per variant (`PATCH /api/v1/inventory/:variantId`).

## Concurrency

Mutations take a PostgreSQL `SELECT … FOR UPDATE` on the inventory row inside a `ReadCommitted` interactive transaction. Concurrent POS and website consumption of the last unit serialize on that lock; the second caller sees insufficient available stock and fails. Frontend checks are not relied on.

Future POS, purchase, and order modules should pass the same transaction client into `increaseStock`, `decreaseStock`, `reserveStock`, `consumeReservedStock`, `applySale`, `applyReturn`, or `applyPurchase` so sale/order/purchase rows and stock move atomically.

The Phase 9 order engine uses `reserveStock` at checkout, `releaseStock` on cancellation before fulfillment, and `consumeReservedStock` when an order is completed. See [orders.md](orders.md).

Purchasing receive writes `InventoryMovement.type = PURCHASE` with a positive quantity, `referenceType = PURCHASE`, `referenceId` = purchase id, and `unitCost` equal to the negotiated purchase cost (not the current catalog cost).

## Inventory value

`GET /api/v1/inventory/summary` values stock as **on-hand quantity × current cost price**. Selling price is not used.

## Permissions

| Role | Access |
| --- | --- |
| OWNER / MANAGER | Full (`inventory.read`, `inventory.adjust`, `inventory.manage`) |
| INVENTORY_MANAGER | `inventory.read` + `inventory.adjust` + `inventory.manage` |
| CASHIER | `inventory.read` (lookup and list) |
| WEBSITE_MANAGER | None |

Enforced by `PermissionsGuard` on the API.

## API

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/api/v1/inventory` | `inventory.read` |
| GET | `/api/v1/inventory/summary` | `inventory.read` |
| GET | `/api/v1/inventory/:variantId` | `inventory.read` |
| GET | `/api/v1/inventory/:variantId/movements` | `inventory.read` |
| GET | `/api/v1/inventory/barcode/:barcode` | `inventory.read` |
| GET | `/api/v1/inventory/sku/:sku` | `inventory.read` |
| POST | `/api/v1/inventory/adjust` | `inventory.adjust` |
| POST | `/api/v1/inventory/opening-stock` | `inventory.adjust` |
| POST | `/api/v1/inventory/:variantId/reserve` | `inventory.adjust` |
| POST | `/api/v1/inventory/:variantId/release` | `inventory.adjust` |
| PATCH | `/api/v1/inventory/:variantId` | `inventory.manage` |

List and movement history are paginated (max 100). They support search, filters, sorting, and date ranges on movements. Movement history is never returned unbounded.
