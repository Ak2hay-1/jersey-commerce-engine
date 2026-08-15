# Architecture

## Purpose

Jersey Commerce Engine is a multi-application commerce platform. It includes a customer storefront, POS, ERP/admin, inventory, purchasing, CRM, payments, expenses, reporting, CMS, roles, audit logs, and multi-tenant isolation.

Phase 1 delivered the **database and backend foundation**. Later phases add authentication, the product catalog, and the inventory ledger. POS checkout UI, storefront checkout, and payment gateways belong to later phases.

## System shape

```text
                ┌─────────────────┐
                │   Storefront    │
                │   Next.js :3000 │
                └────────┬────────┘
                         │
┌──────────────┐         │         ┌──────────────┐
│    Admin     │─────────┼─────────│     POS      │
│ Next.js :3001│         │         │ Next.js :3002│
└──────────────┘         │         └──────────────┘
                         │
                ┌────────▼────────┐
                │   NestJS API    │
                │     :4000       │
                └────────┬────────┘
             ┌───────────┴───────────┐
             │                       │
     ┌───────▼────────┐      ┌───────▼────────┐
     │   PostgreSQL   │      │     Redis      │
     └────────────────┘      └────────────────┘
```

All HTTP clients talk to one API. The API owns persistence, caching, validation, and cross-cutting concerns such as logging and errors.

## Applications

| App | Responsibility now | Responsibility later |
| --- | --- | --- |
| Storefront | Tenant-agnostic Next.js shell | Catalog, checkout, CMS-driven pages |
| Admin | Tenant-agnostic Next.js shell | ERP, inventory, purchases, CRM, reports, users |
| POS | Tenant-agnostic Next.js shell | Register sales, in-store payments, receipts |
| API | Health, versioned read APIs, Prisma domain model, Redis | Auth, write APIs, tenancy enforcement from sessions |

## Shared packages

| Package | Role |
| --- | --- |
| `@jersey-commerce/ui` | shadcn/ui primitives and design tokens as CSS variables |
| `@jersey-commerce/types` | API, health, tenant, enum, and permission contracts |
| `@jersey-commerce/validation` | Zod schemas shared by API and clients |
| `@jersey-commerce/config` | Ports and environment schemas |
| `@jersey-commerce/utils` | Logger helper and small utilities |

Next.js applications consume `@jersey-commerce/ui` source through `transpilePackages`. NestJS consumes compiled `dist` output of the other packages.

## Multi-tenancy

Every independent business is a tenant. `Tenant` owns shop names, branding, catalogs, users, and documents. Application code, CSS, and configuration must not embed:

- shop names
- logos
- products
- domains
- brand colors
- other business-specific copy

Theme tokens in `@jersey-commerce/ui` are generic defaults. Tenant branding will override tokens at runtime in a later phase.

Authentication, RBAC, tenant isolation, and the product catalog are implemented. See [auth.md](auth.md). The inventory ledger is implemented in Phase 4; see [inventory.md](inventory.md). The POS backend (sessions, carts, transactional sales) is implemented in Phase 5; see [pos.md](pos.md). Customers and CRM are implemented in Phase 7; see [customers.md](customers.md). Suppliers, purchase orders, receiving, and supplier payables are implemented in Phase 8; see [suppliers.md](suppliers.md) and [purchasing.md](purchasing.md). The ecommerce order engine is implemented in Phase 9; see [orders.md](orders.md). POS checkout UI, storefront UI, and payment gateways belong to later phases.

## API conventions

- Liveness: `GET /health`
- Readiness: `GET /ready` (PostgreSQL and Redis)
- Versioned domain routes: `/api/v1/...`
- OpenAPI: `/docs`
- Success envelope for `/api/v1` routes: `{ success: true, data }`
- Errors: `{ success: false, error: { code, message, details, timestamp, path, requestId } }`
- 404 uses `RESOURCE_NOT_FOUND`
- Missing or invalid bearer token uses `UNAUTHORIZED` (401)
- Missing permission uses `FORBIDDEN` (403)
- Structured request logs via `nestjs-pino`, with authorization headers redacted
- DTO validation via `class-validator` / `class-transformer`

Domain modules exist for auth, tenants, users, roles, permissions, products, categories, inventory, customers, suppliers, purchases, sales, orders, payments, expenses, website, and audit. Catalog, inventory, purchasing, and order writes go through their dedicated services. Storefront UI and payment gateways belong to later phases.

## Backend module map

```text
apps/api/src/
  auth/          Login, refresh, logout, me, password change
  common/        JWT/permission guards, tenant context, rate limit
  rbac/          Default role-permission map
  tenants/       Current-tenant reads + bootstrap create
  users/         Tenant-scoped user reads and owner/manager mutations
  roles/
  permissions/   Platform permission catalog
  products/
  categories/
  inventory/     Variant stock, reservations, and append-only movement ledger
  pos/           Register sessions, carts, lookup, and transactional sales
  payments/      Provider-agnostic payment capture and history
  reports/       Sales, payment, POS session, and purchasing summaries from ledgers
  receipts/      Frozen receipt payloads and printable HTML
  customers/     CRM profiles, notes, tags, derived spend and segments
  suppliers/     Vendor records, search, and derived payables
  purchases/     Purchase orders, receiving, and supplier payments
  sales/
  orders/        Ecommerce, WhatsApp, and manual orders; status machine; payment intents
  store/         Public cart, checkout, and customer order history
  payments/      Gateway-agnostic Payment ledger
  expenses/
  website/
  audit/
```

## Deployment shape

Dockerfiles under `infra/docker/` and `.github/workflows/ci.yml` are ready for later pipeline expansion. CI currently installs dependencies, validates Prisma, typechecks, lints, tests the API, and builds the workspace.
