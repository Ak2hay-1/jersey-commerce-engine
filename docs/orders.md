# Ecommerce order engine

Phase 9 of the Jersey Commerce Engine. This is the backend order system for the future customer storefront. It reuses the product catalog, inventory ledger, customer/CRM records, payment ledger, and tenant RBAC. It does **not** create a second catalog, customer table, or stock ledger.

POS remains a separate checkout path (`Sale` + `PosCart`). Website, WhatsApp, and manual orders share the `Order` model.

## Cart

`Cart` / `CartItem` are storefront working documents. Adding an item does **not** reduce on-hand stock and does **not** create a reservation.

| Status | Meaning |
| --- | --- |
| `ACTIVE` | Guest or customer can still edit items |
| `CONVERTED` | Checkout created an order |
| `ABANDONED` | Reserved for later cleanup jobs |
| `EXPIRED` | Past `expiresAt` (14 days) |

Guests identify a cart with an opaque `cart_…` token (`X-Cart-Token` or httpOnly cookie `jce_cart_token`). The API returns a public cart id, not the internal row id. The raw token is stored as SHA-256 only.

Prices on cart lines are snapshots for display. Checkout always reloads the current variant selling price, tax, and availability. The client cannot set price, tax, discount, or stock.

## Checkout

`POST /api/v1/store/checkout` is atomic:

1. Load and validate the cart  
2. Reload current product/variant data  
3. Reject inactive/non-purchasable items  
4. Calculate merchandise, discount, tax, and shipping server-side  
5. Reserve inventory through `InventoryService.reserveStock`  
6. Allocate `ORD-000001` from `DocumentSequence` (`ORDER`, unique per tenant)  
7. Create `Order` + `OrderItem` snapshots + shipping address snapshot  
8. Associate or create a `Customer` using CRM duplicate detection  
9. Create a **PENDING** online payment intent (`PaymentGateway.createPaymentIntent`)  
10. Mark the cart `CONVERTED`  
11. Write audit events  

Checkout is **not** payment confirmation. Order status starts at `PENDING`. Payment status starts at `PAYMENT_PENDING`.

Retry safety:

- `Idempotency-Key` is hashed per tenant. The same key and payload return the original order. A different payload with the same key is rejected.  
- Redis holds a short lock per cart so two concurrent `PAY NOW` clicks cannot create two orders.  
- A converted cart cannot be checked out again.

Rate limit: 8 checkout attempts / 60 seconds (in addition to the global API throttle).

Storefront tenant context comes from `X-Tenant-Slug`. Client `tenantId` values are ignored.

## Order and payment status

These are separate fields.

| Order status | Typical meaning |
| --- | --- |
| `PENDING` | Placed, awaiting payment or staff confirmation |
| `CONFIRMED` | Accepted after payment or staff confirmation |
| `PROCESSING` | Being prepared |
| `READY` | Ready to ship or collect |
| `SHIPPED` | Delivery only |
| `COMPLETED` | Delivered or collected. Reserved stock is consumed here |
| `CANCELLED` | Cancelled before fulfillment. Reservation released |
| `RETURNED` / `REFUNDED` | After-fulfillment reversals (no fake refunds) |

Payment states on the order DTO: `PAYMENT_PENDING`, `PAYMENT_COMPLETED`, `PAYMENT_FAILED`, `PAYMENT_CANCELLED`, `PAYMENT_REFUNDED`, `PAYMENT_PARTIALLY_REFUNDED`. The payment ledger still uses the existing `PaymentStatus` enum.

Allowed transitions are enforced. `COMPLETED → PROCESSING` and `CANCELLED → CONFIRMED` are rejected.

Pickup orders use `STORE_PICKUP`: no shipping address, no `SHIPPED` step, `READY → COMPLETED` on collection. Delivery uses `READY → SHIPPED → COMPLETED`.

## Inventory

| Event | InventoryService | On hand | Reserved | Available |
| --- | ---: | ---: | ---: | ---: |
| Add to cart | none | 10 | 0 | 10 |
| Checkout | `reserveStock` | 10 | 2 | 8 |
| Cancel before fulfillment | `releaseStock` | 10 | 0 | 10 |
| Order completed | `consumeReservedStock` (`ONLINE_ORDER`) | 8 | 0 | 8 |

Two checkouts cannot reserve the last unit: reservation takes `SELECT … FOR UPDATE` on the inventory row inside the checkout transaction.

Orders never write `inventories` or `inventory_movements` directly.

## Payments

`PaymentGateway` is the online port:

- `createPaymentIntent()` — creates a `PENDING` `Payment` on the order  
- `verifyPayment()` — not implemented until a real provider exists  
- `refundPayment()` — not implemented until a real provider exists  

The unconfigured adapter **does not** mark ONLINE payments completed. That is the same rule as Phase 6 `OnlinePaymentProvider`.

Staff WhatsApp/manual orders use the same `Order` + PENDING payment intent. Capturing cash/UPI for those orders remains a later wiring of the existing POS payment providers; this phase does not invent a successful gateway response.

## Order → sale

`OrderSaleRecognitionService` is the boundary for revenue recognition. Completing an order consumes reserved stock. It does **not** insert a `Sale` row in this phase, so the POS sales engine is not duplicated. `Order.saleId` exists for a later link.

## Customers

Authenticated storefront customers receive a `customer` JWT at checkout (`typ: customer`, 30 days). `GET /api/v1/store/orders` only returns that customer’s orders.

Guest checkout creates or attaches a CRM customer by phone/email using the existing duplicate detector. Blocked customers cannot order. Profile address edits do not change `OrderShippingAddress`.

## Endpoints

Storefront (public + `X-Tenant-Slug`):

- `POST /api/v1/store/cart`
- `GET /api/v1/store/cart`
- `POST /api/v1/store/cart/items`
- `PATCH /api/v1/store/cart/items/:id`
- `DELETE /api/v1/store/cart/items/:id`
- `DELETE /api/v1/store/cart`
- `POST /api/v1/store/checkout`
- `GET /api/v1/store/orders` (customer token)
- `GET /api/v1/store/orders/:id`
- `POST /api/v1/store/orders/:id/cancel`

Staff (JWT + RBAC):

- `GET /api/v1/orders` — filters: order number, customer, phone, status, payment status, source, date range, amount range, pagination
- `GET /api/v1/orders/:id`
- `POST /api/v1/orders` — `WHATSAPP` or `MANUAL`
- `PATCH /api/v1/orders/:id/status`
- `POST /api/v1/orders/:id/cancel`

Permissions: `orders.read`, `orders.create`, `orders.update`, `orders.cancel`. Website managers and cashiers receive order access appropriate to taking website or phone orders.

## Shipping, tax, discounts

Shipping is calculated from tenant settings (`FREE` or `FIXED`, optional free-shipping threshold). Pickup is always zero. This is not a courier or zone engine.

Tax uses the existing tenant `defaultTaxRate` / variant `taxRate` and inclusive flag. Line `tax` is stored at order time. This is **not** a verified GST filing profile.

Order-level `FIXED` / `PERCENTAGE` discounts are validated server-side. There is no coupon engine in this phase. Storefront checkout does not accept client discount amounts.

## Audit

Logged without payment credentials or extra PII: cart created, checkout started, order created, payment state changes, confirmed, status changed, cancelled, stock reserved/released/consumed.
