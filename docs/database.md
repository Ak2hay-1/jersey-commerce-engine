# Database

## Engine

PostgreSQL 16 is the system of record. Redis 7 is the cache and future session/job substrate. Both run locally through `infra/docker/docker-compose.yml`.

## Prisma

Schema path: `apps/api/prisma/schema.prisma`  
Migrations path: `apps/api/prisma/migrations/`  
Seed path: `apps/api/prisma/seed.ts`

Identifiers use CUID consistently. Table and column names are snake_case in PostgreSQL and camelCase in Prisma.

Useful commands from the repository root:

```powershell
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate
npm run prisma:migrate:deploy
npm run prisma:seed
npm run prisma:studio
```

Use `prisma migrate` (not `db push`) as the database evolution strategy. `prisma:migrate` is for local development. `prisma:migrate:deploy` applies already-created migrations in shared environments.

## Tenant isolation

`Tenant` is the isolation root for every independent business.

- Each shop is one tenant.
- Tenant-owned tables include `tenantId` directly.
- Tenant isolation is enforced in the API from the authenticated identity and Prisma tenant scoping. Client `x-tenant-id` headers are ignored for authorization.
- Shop names, logos, colors, domains, and catalogs are tenant data, not application constants.

A tenant must never be able to read another tenant's records. Authentication will enforce identity in Phase 2; isolation is already encoded in the schema and read endpoints.

## Connection string

Local default (development only, not a production secret):

```text
postgresql://jersey:jersey@localhost:5432/jersey_commerce?schema=public
```

Override `DATABASE_URL` in `apps/api/.env`. Never commit real credentials.

## Financial history

Sales, payments, purchases, and inventory movements are retained. Line items store product name, SKU, variant, `unitPrice`, `costPrice`, discount, tax, and line total captured at transaction time. Inventory movements store `unitCost` at the time of the stock change. Do not reconstruct historical revenue or stock value from the current catalog price. Corrections are refund or cancellation rows, not destructive edits.

Append-only ledgers (no `updatedAt`):

- `InventoryMovement`
- `AuditLog`
- `SupplierPayment`

`Payment` amounts are immutable. Status may change (`REFUNDED`, `PARTIALLY_REFUNDED`) and `updatedAt` records that transition. `Refund`, `RefundItem`, and `RefundPayment` hold reversal history. Invoice numbers live on `DocumentSequence` (unique per tenant, never reused after cancellation).

Documents that may change status keep `updatedAt` (`Sale`, `Order`, `Purchase`, `Expense`, `Payment`, `Refund`). Status changes are allowed; rewriting amounts is not.

## Seed data

`npm run prisma:seed` loads **development-only** data:

| Kind | Values |
| --- | --- |
| Tenant | Demo Jersey Store (`demo-jersey-store`) |
| Users | Owner, Manager, Cashier, Inventory Manager, Website Manager |
| Password | `DevPassword123!` for every demo user |
| Categories | Sportswear tree including Football, Cricket, Club Jerseys, National Jerseys, IPL, International, Custom Jerseys, Kids |
| Products | Replica jerseys with sizes, SKUs, barcodes, placeholder images, and opening-stock movements (India Jersey M/L/XL 25/40/20, Real Madrid Jersey M/L 15/30) |
| Suppliers | Premium Sports Suppliers, India Sports Wholesale, Teamwear Distributors |
| Purchases | Example draft, partial receipt, full receipt, and a partial supplier payment that matches those quantities |

Never use seeded credentials in production.

## Entity overview

| Area | Models |
| --- | --- |
| Tenant | `Tenant` |
| Identity / RBAC | `User`, `Role`, `Permission`, `UserRole`, `RolePermission` |
| Catalog | `Category`, `Product`, `ProductVariant`, `ProductImage` |
| Inventory | `Inventory`, `InventoryMovement` |
| Parties | `Customer`, `Tag`, `CustomerTag`, `CustomerNote`, `CustomerPreference`, `Supplier` |
| Purchasing | `Purchase`, `PurchaseItem`, `PurchaseReceipt`, `PurchaseReceiptItem`, `SupplierPayment` |
| Sales | `Sale`, `SaleItem` |
| POS | `PosSession`, `PosCart`, `PosCartItem`, `DocumentSequence` |
| Storefront cart | `Cart`, `CartItem` |
| Orders | `Order`, `OrderItem`, `OrderShippingAddress`, `CheckoutIdempotency` |
| Custom orders | `CustomOrder`, `CustomOrderItem`, `CustomOrderQuote`, `CustomOrderDesign`, `CustomOrderDesignApproval`, `CustomOrderFile`, `CustomizationOption`, `CustomOrderCustomization`, timeline/notes/production/communication events |
| Payments | `Payment` (sale, order, or custom order) |
| Refunds | `Refund`, `RefundItem`, `RefundPayment` |
| Expenses | `ExpenseCategory`, `Expense` |
| Website | `WebsiteSettings`, `TenantHost` |
| Audit | `AuditLog` |
| Backup (schema only) | `BackupSettings`, `BackupRun` |

Customer payments for sales, ecommerce orders, and custom jersey orders use one generic `Payment` table (`saleId` / `orderId` / `customOrderId`). That table is the SalePayment, OrderPayment, and CustomOrderPayment ledger. Supplier payouts are separate (`SupplierPayment`) because they are accounts-payable records.

## Indexes and uniqueness

Composite unique constraints include:

- `users (tenantId, email)`
- `roles (tenantId, code)`
- `categories (tenantId, slug)`
- `products (tenantId, slug)`
- `product_variants (tenantId, sku)` and `(tenantId, barcode)`
- `purchases (tenantId, purchaseNumber)`
- `sales (tenantId, invoiceNumber)`
- `document_sequences (tenantId, documentType)`
- `orders (tenantId, orderNumber)`
- `custom_orders (tenantId, orderNumber)` and `custom_orders.public_id`
- `custom_order_quotes (customOrderId, version)` and `(tenantId, quoteNumber, version)`
- `custom_order_designs (customOrderId, version)`
- `carts.public_id`, `carts.token_hash`
- `checkout_idempotency (tenantId, keyHash)`
- `tags (tenantId, slug)`
- `customer_tags (customerId, tagId)`
- `website_settings.tenantId`

Common lookup indexes exist on `tenantId`, `slug`, `sku`, `barcode`, `email`, `phone`, invoice/order/purchase numbers, and created-at timestamps.

## Relationships

```mermaid
erDiagram
  Tenant ||--o{ User : has
  Tenant ||--o{ Role : has
  Tenant ||--o{ Category : has
  Tenant ||--o{ Product : has
  Tenant ||--o| WebsiteSettings : has
  Permission ||--o{ RolePermission : granted_by
  Role ||--o{ RolePermission : includes
  User ||--o{ UserRole : assigned
  Role ||--o{ UserRole : given_to
  Category ||--o{ Category : parent
  Category ||--o{ Product : contains
  Product ||--o{ ProductVariant : has
  Product ||--o{ ProductImage : has
  ProductVariant ||--o| Inventory : stock
  ProductVariant ||--o{ InventoryMovement : ledger
  Tenant ||--o{ Customer : has
  Customer ||--o{ CustomerTag : tagged
  Tag ||--o{ CustomerTag : used_by
  Customer ||--o{ CustomerNote : notes
  Customer ||--o| CustomerPreference : prefs
  Tenant ||--o{ Supplier : has
  Supplier ||--o{ Purchase : billed
  Purchase ||--o{ PurchaseItem : lines
  Purchase ||--o{ PurchaseReceipt : receipts
  PurchaseReceipt ||--o{ PurchaseReceiptItem : lines
  PurchaseItem }o--|| ProductVariant : buys
  Supplier ||--o{ SupplierPayment : paid
  User ||--o{ PosSession : cashiers
  PosSession ||--o{ PosCart : has
  PosCart ||--o{ PosCartItem : lines
  PosCartItem }o--|| ProductVariant : scans
  Tenant ||--o{ Cart : storefront
  Cart ||--o{ CartItem : lines
  CartItem }o--|| ProductVariant : holds
  Customer ||--o{ Sale : purchases
  User ||--o{ Sale : cashiers
  Sale ||--o{ SaleItem : lines
  SaleItem }o--|| ProductVariant : sold
  Customer ||--o{ Order : places
  Order ||--o{ OrderItem : lines
  Order ||--o| OrderShippingAddress : ships
  Order ||--o| Cart : converted_from
  Customer ||--o{ CustomOrder : commissions
  CustomOrder ||--o{ CustomOrderItem : lines
  CustomOrder ||--o{ CustomOrderQuote : quotes
  CustomOrder ||--o{ CustomOrderDesign : designs
  Sale ||--o{ Payment : collected
  Order ||--o{ Payment : collected
  CustomOrder ||--o{ Payment : collected
  Tenant ||--o{ ExpenseCategory : has
  ExpenseCategory ||--o{ Expense : classified
  User ||--o{ AuditLog : performs
```

`Expense.status` is `ACTIVE` or `VOIDED`. Voiding retains the row. Dashboard and expense reports sum only `ACTIVE` expenses. See [expenses.md](expenses.md) and [dashboard.md](dashboard.md).

Category hierarchy example:

```text
Sportswear
  Football
    Club Jerseys
    National Jerseys
  Cricket
    IPL
    International
  Custom Jerseys
  Kids
```

## Readiness

The API `GET /ready` endpoint runs `SELECT 1` against PostgreSQL and `PING` against Redis. Orchestrators should use:

- `/health` for liveness
- `/ready` for traffic admission
