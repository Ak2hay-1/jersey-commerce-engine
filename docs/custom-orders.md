# Custom and bulk jersey orders

Phase 11 adds a **custom/team jersey order engine** on top of the existing tenant, CRM, catalog, inventory, and payment stack. It is not a second ecommerce checkout. Guest enquiries, versioned quotes, design approval, deposits, and production tracking live on `CustomOrder` and related tables. Regular catalog checkout remains on `Order`.

This phase does not include manufacturing/MRP, raw-material ERP, courier tracking, WhatsApp/email sending, or an AI design generator. Communication rows are stored so a later messaging phase can consume them.

## Architecture

```text
Storefront /custom-orders
        │  X-Tenant-Slug (never client tenantId)
        ▼
StoreCustomOrdersController     guest enquiry, quote accept, design decision
        │
        ▼
CustomOrdersService
        ├── CustomersService.resolveForOrder     duplicate detection
        ├── PaymentProcessor.prepareCapture      deposits and balances
        ├── PaymentsService.persist              Payment.customOrderId
        ├── InventoryService                     optional variant reserve
        └── ObjectStorage                        private design files

Admin /api/v1/custom-orders
        │  JWT tenant + RBAC
        ▼
CustomOrdersController          quotes, designs, production, payments, notes
```

Tenant A cannot read Tenant B custom orders, designs, quotes, customers, or production events. Guest routes resolve the tenant from `StoreTenantGuard` (`X-Tenant-Slug` or configured host). Authenticated staff routes use the JWT tenant. Client-supplied `tenantId` is ignored.

## Enquiry lifecycle

1. Guest submits `POST /api/v1/store/custom-orders/inquiry` (account not required).
2. Contact details create or reuse a `Customer` through CRM duplicate detection (phone, then email).
3. Status starts at `INQUIRY`. Reference files may be attached. Inventory is **not** consumed.
4. Staff convert the enquiry (team items / type) → `QUOTATION`.
5. Staff issue a quote (optionally mark sent) → `QUOTE_SENT`.
6. Customer accepts the current quote → `DEPOSIT_PENDING` when a deposit is required, otherwise `CONFIRMED`.
7. Staff record the deposit → `CONFIRMED` when `depositPaid >= depositRequired`.
8. Design upload / approval, then production → `READY` → `COMPLETED`.

Arbitrary jumps (for example `INQUIRY` → `PRODUCTION`) are rejected.

```text
INQUIRY → QUOTATION → QUOTE_SENT → CUSTOMER_APPROVAL
       ↘            ↘            ↘
         DEPOSIT_PENDING → CONFIRMED → DESIGN_PENDING → DESIGN_APPROVAL
                                              ↓
                                         PRODUCTION → READY → COMPLETED
Any in-progress status → CANCELLED
```

## Quote lifecycle

Quotes are versioned. Creating a new quote keeps previous rows and marks them `SUPERSEDED`. Only one version is `isCurrent`. Quote numbers look like `QT-000001`; versions share that number (`v1`, `v2`, `v3`).

A quote cannot be accepted when it is expired, cancelled, superseded, or not current. Acceptance records the quote version, timestamp, and customer.

Totals:

`merchandise = unitPrice × quantity`  
`subtotal = merchandise + customizationCharges`  
`total = subtotal − discount + tax + shipping`  
`deposit` cannot exceed `total`.

Customization option prices are tenant data (`FIXED`, `PER_ITEM`, `PERCENTAGE`). They are snapshotted onto the order when selected so later price edits do not rewrite history.

## Design approval

Uploading a file creates **Design vN**. Previous versions are retained. Upload is not approval (`approvalStatus` starts `PENDING`).

Staff request approval. The customer (public token `publicId`) or staff can `APPROVE` or `REQUEST_CHANGES`. Each decision stores comment, actor, timestamp, and design version.

Allowed reference/design types: PNG, JPG/JPEG, WEBP, PDF. Executables are rejected. Magic bytes, extension, and declared MIME must agree. Max 8MB, max 5 files on enquiry. Storage keys are generated; client filenames are sanitized and never used as paths. Files are **not** served from public `/api/v1/media` (paths containing `custom-orders` 404). Staff and the matching public order stream them from custom-order routes.

## Bulk / team ordering

`CustomOrderItem` holds the configuration. Do not invent catalog variants per player.

| Mode | Example |
| --- | --- |
| `PLAYER_LIST` | Rahul — M — #10 |
| `SIZE_QUANTITY` | S=5, M=12, L=18, XL=10, XXL=3 → quantity 48 |

A line may optionally reference an existing `productVariantId`. Custom name, number, size, colour, and fees stay on the item.

## Deposits and payments

Payment state is separate from production status.

| Field | Meaning |
| --- | --- |
| `depositRequired` | Amount that must be collected before confirmation |
| `depositPaid` | Completed payments applied toward the deposit |
| `balanceDue` | `total − paid` |
| `paymentStatus` | `UNPAID`, `DEPOSIT_RECEIVED`, `PARTIALLY_PAID`, `PAID` |

A ₹20,000 deposit on a ₹50,000 order leaves ₹30,000 due and **does not** mark the order `PAID`. Completing the remainder sets `PAID`.

Captures reuse `PaymentProcessor` / providers: `CASH`, `UPI`, `CARD`, `ONLINE` (never succeeds), `BANK_TRANSFER`, `OTHER`. `Payment.customOrderId` links the ledger. Card numbers and other secrets are not stored or audited.

## Production

Production sub-status is independent of the commercial status machine:

`DESIGN_PENDING` → `DESIGN_APPROVAL` → `MATERIAL_PENDING` → `PRODUCTION` → `QUALITY_CHECK` → `READY`

Staff notes (`customOrders.production`) are internal. Timeline events are append-only (enquiry, quote, acceptance, deposit, design, production, completion, cancellation).

Communication events (`QUOTE_CREATED`, `QUOTE_SENT`, `DESIGN_READY`, `DESIGN_APPROVAL_REQUIRED`, `ORDER_CONFIRMED`, `PRODUCTION_STARTED`, `READY_FOR_PICKUP`, `ORDER_COMPLETED`) are persisted for a later messaging phase. Nothing is sent in Phase 11.

## Inventory

Enquiry does not reserve stock. After confirmation, staff may set `reserveInventory: true` when items reference catalog variants. Completion consumes a reservation; cancellation releases it. There is no raw-material inventory in this phase.

## CRM

Every custom order has a `customerId`. Profile `GET /api/v1/customers/:id` keeps POS/website `metrics` separate from `customOrderMetrics` (completed custom orders only). History and activity include `CUSTOM_ORDER` rows. Duplicate customers are not created for matching phone/email.

## Permissions

| Permission | OWNER | MANAGER | WEBSITE_MANAGER | CASHIER | INVENTORY_MANAGER |
| --- | --- | --- | --- | --- | --- |
| `customOrders.read` | yes | yes | yes | yes | yes |
| `customOrders.create` | yes | yes | yes | no | no |
| `customOrders.update` | yes | yes | yes | no | no |
| `customOrders.quote` | yes | yes | no | no | no |
| `customOrders.design` | yes | yes | yes | no | no |
| `customOrders.approve` | yes | yes | no | no | no |
| `customOrders.production` | yes | yes | no | no | no |
| `customOrders.payment` | yes | yes | no | yes | no |

## Public endpoints

| Method | Path |
| --- | --- |
| GET | `/api/v1/store/custom-orders/config` |
| POST | `/api/v1/store/custom-orders/inquiry` |
| GET | `/api/v1/store/custom-orders/:publicId` |
| GET | `/api/v1/store/custom-orders/:publicId/files/:fileId` |
| POST | `/api/v1/store/custom-orders/:publicId/approve-design` |
| POST | `/api/v1/store/custom-orders/:publicId/request-design-changes` |
| POST | `/api/v1/store/custom-orders/:publicId/accept-quote` |

## Admin endpoints

| Method | Path |
| --- | --- |
| GET | `/api/v1/custom-orders` |
| POST | `/api/v1/custom-orders` |
| GET | `/api/v1/custom-orders/:id` |
| PATCH | `/api/v1/custom-orders/:id` |
| POST | `/api/v1/custom-orders/:id/quote` |
| POST | `/api/v1/custom-orders/:id/design` |
| POST | `/api/v1/custom-orders/:id/design/request-approval` |
| POST | `/api/v1/custom-orders/:id/approve` |
| POST | `/api/v1/custom-orders/:id/deposit` |
| PATCH | `/api/v1/custom-orders/:id/status` |
| POST | `/api/v1/custom-orders/:id/cancel` |
| GET | `/api/v1/custom-orders/:id/timeline` |
| GET/POST | `/api/v1/custom-orders/:id/notes` |
| GET | `/api/v1/custom-orders/:id/files/:fileId` |
| GET/POST/PATCH | `/api/v1/customization-options` |

## Storefront

`/custom-orders` is a themed landing page (benefits, process, customization options, bulk ordering, multi-step enquiry). `/custom-orders/[publicId]` lets the customer accept a quote and approve or request design changes. Header link: **Custom**.

## Audit

Logged (no payment credentials): enquiry created, quote created/changed/accepted, design uploaded, approval requested, design approved, changes requested, deposit, production started, status changed, final payment, completion, cancellation.
