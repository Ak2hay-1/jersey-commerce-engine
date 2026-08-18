# Customers and CRM

Phase 7 adds a tenant-scoped customer profile and CRM engine. Physical POS sales and future website, WhatsApp, and manual orders share one customer record. Spend, purchase counts, and segments are **derived from sales and orders**. They are not stored on the customer row.

This phase does not include a CRM dashboard UI, marketing campaigns, loyalty, or storefront account pages.

## Architecture

```text
Admin / POS / future checkout
            │
            ▼
    CustomersController     RBAC + tenant from JWT
            │
            ├─ CustomersService          CRUD, search, duplicates, notes, tags
            └─ CustomerInsightsService   history, activity, metrics, segments, reports
                    │
                    ├─ Sale / SaleItem / Refund     POS
                    ├─ Order / OrderItem            website / WhatsApp / manual
                    └─ CustomOrder                  team / bulk jersey work
```

Walk-in POS sales keep `customerId = null`. Customer registration is never required to complete a sale.

## Customer model

| Field | Notes |
| --- | --- |
| `id`, `tenantId` | Isolation root is the tenant. Client `tenantId` is ignored. |
| `name` | Required |
| `phone` | Stored as digits. `+91 98765 43210` becomes `9876543210`. Indexed with `tenantId`. |
| `email` | Lowercased. Indexed with `tenantId`. |
| `address`, `city`, `state`, `postalCode` | Single primary address. Multiple addresses belong to a later ecommerce phase. |
| `notes` | Short profile memo for staff. Not a storefront field. |
| `status` | `ACTIVE`, `INACTIVE`, `BLOCKED` |
| `createdAt`, `updatedAt` | |

Related models (no duplicated transaction data):

- `Tag` / `CustomerTag` — reusable tenant tags
- `CustomerNote` — internal staff notes with `createdBy`
- `CustomerPreference` — `emailOptIn`, `smsOptIn`, `whatsappOptIn` (storage only; no messages are sent)

`DELETE` does not destroy sales, orders, or custom orders. If the customer has any sale, order, custom order, or POS cart, status becomes `INACTIVE`. Customers without history may be deleted; notes, tag assignments, and preferences cascade.

## CRM metrics

Counted purchases:

- POS `Sale` in `COMPLETED` or `PARTIALLY_REFUNDED`, net of completed refunds
- `Order` in `COMPLETED` (website, WhatsApp, or manual)

Excluded: cancelled/voided/fully refunded sales, cancelled/returned/refunded orders, failed payments.

| Metric | Source |
| --- | --- |
| Total orders | Count of counted purchases |
| Total spent | Sum of counted totals minus completed refunds |
| Average order | Total spent / total orders |
| Total items | Sale and order quantities minus refunded quantities |
| First / last purchase | Min / max counted `createdAt` |

`GET /api/v1/customers/:id` returns these fields plus `segments` and `primarySegment`. Completed custom/team jersey orders are returned separately as `customOrderMetrics` so they are not mixed into POS or website spend. History and activity include `CUSTOM_ORDER` rows. See [custom-orders.md](custom-orders.md).

## Segmentation

Thresholds live in one module (`crm-settings.ts`). Report query params can override them. They are not copied through services.

| Segment | Default rule |
| --- | --- |
| `NEW` | Exactly 1 counted purchase |
| `REPEAT` | 2 or more counted purchases |
| `HIGH_VALUE` | Total spent ≥ ₹10,000 |
| `INACTIVE` | No counted purchase (or customer created, if none) for 90 days |

A customer may match more than one segment. Display priority: `HIGH_VALUE` → `INACTIVE` → `REPEAT` → `NEW`.

## Tags and notes

Tags are tenant data (Football, Cricket, IPL, VIP, and so on). Assigning by `name` creates the tag if needed. Removing an assignment does not delete the tag.

Staff notes require `customers.notes`. They are omitted from storefront APIs. Profile `GET` does not include note bodies; use `GET /customers/:id/notes`.

## Duplicate prevention

Create and update look up existing `phone` and `email` after normalization. Matches return **409 CONFLICT** with `details.possibleMatches`. The API never merges customers. Staff may resubmit with `allowDuplicate: true`.

## POS integration

Cashiers (`customers.read` + `customers.create`):

- `GET /api/v1/pos/customers?search=` — compact lookup
- `GET /api/v1/customers?search=` — same search on the CRM list
- `POST /api/v1/customers` or cart `newCustomer`
- Attach `customerId` on the cart, or `walkIn: true`

Blocked customers cannot be attached to a cart. Completed sales with a customer appear on that profile automatically because metrics read `sales.customerId`.

## Order integration

Ecommerce orders are not created in this phase. When they are, they must set `orders.customerId` to the same customer used at POS. The profile history already lists `POS_SALE` and `ORDER` rows together.

## Privacy

- CRM routes require a JWT and customer permissions.
- Internal notes are not returned from public storefront endpoints (none exist in this phase).
- Audit logs store customer id, name, and status — not phone, email, or note bodies.
- Payment credentials and passwords are out of scope and must not be logged.

## Permissions

| Permission | OWNER | MANAGER | CASHIER | INVENTORY_MANAGER | WEBSITE_MANAGER |
| --- | --- | --- | --- | --- | --- |
| `customers.read` | yes | yes | yes | yes | yes |
| `customers.create` | yes | yes | yes | no | no |
| `customers.update` | yes | yes | no | no | no |
| `customers.delete` | yes | yes | no | no | no |
| `customers.notes` | yes | yes | no | no | no |
| `customers.tags` | yes | yes | no | no | no |

## Endpoints

| Method | Path |
| --- | --- |
| GET | `/api/v1/customers` |
| GET | `/api/v1/customers/summary` |
| GET | `/api/v1/customers/top` |
| GET | `/api/v1/customers/repeat` |
| GET | `/api/v1/customers/inactive` |
| GET | `/api/v1/customers/tags` |
| GET | `/api/v1/customers/:id` |
| GET | `/api/v1/customers/:id/history` |
| GET | `/api/v1/customers/:id/activity` |
| GET | `/api/v1/customers/:id/summary` |
| POST | `/api/v1/customers` |
| PATCH | `/api/v1/customers/:id` |
| DELETE | `/api/v1/customers/:id` |
| GET | `/api/v1/customers/:id/notes` |
| POST | `/api/v1/customers/:id/notes` |
| POST | `/api/v1/customers/:id/tags` |
| DELETE | `/api/v1/customers/:id/tags/:tagId` |
| GET | `/api/v1/pos/customers` |

List and report routes accept pagination. Reports also accept `from`, `to`, `sort` (`totalSpent` \| `purchaseCount`), `highValueThreshold`, and `inactiveDays`.
