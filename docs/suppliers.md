# Suppliers

Phase 8 of the Jersey Commerce Engine. Purchasing workflows are documented in [purchasing.md](purchasing.md).

## Purpose

A supplier is a tenant-scoped vendor the business buys stock from. Supplier records hold contact and tax details. What the business **owes** a supplier is not stored on the supplier row. It is derived from payable purchases minus completed supplier payments.

## Lifecycle

| Status | Meaning |
| --- | --- |
| `ACTIVE` | Can be used on new purchase orders |
| `INACTIVE` | Archived. Historical purchases remain. New purchases are rejected. |
| `BLOCKED` | Explicitly blocked. New purchases are rejected. |

`DELETE /api/v1/suppliers/:id` never destroys a supplier that has purchase history. Those records are deactivated (`INACTIVE`) so purchase and payment history stay intact. Only suppliers with zero purchases are deleted.

## Search

`GET /api/v1/suppliers` is tenant-scoped and supports:

- search on name, contact person, phone, and email
- status filter
- pagination
- sort (`name`, `createdAt`, `updatedAt`)

Client-supplied `tenantId` values are ignored. Tenant context comes from the authenticated session.

## Balance

`GET /api/v1/suppliers/:id/balance` returns:

| Field | Source |
| --- | --- |
| `totalPurchases` | Sum of `Purchase.total` in `ORDERED`, `PARTIALLY_RECEIVED`, and `RECEIVED` |
| `totalPaid` | Sum of completed `SupplierPayment.amount` |
| `outstandingAmount` | `totalPurchases - totalPaid` |

Draft and cancelled purchases are excluded. Payments never store card numbers, UPI PINs, or bank credentials. Only method, amount, and a non-secret reference (UTR, cheque number) are kept.

## Purchase history

`GET /api/v1/suppliers/:id/purchases` lists that supplier's purchase orders with date range, status, purchase number, pagination, and sorting.

## Permissions

| Role | Access |
| --- | --- |
| OWNER | Full |
| MANAGER | Full (except `settings.manage`) |
| INVENTORY_MANAGER | `suppliers.read/create/update/delete` plus purchasing and receiving |
| CASHIER | None |
| WEBSITE_MANAGER | None |

## API

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/api/v1/suppliers` | `suppliers.read` |
| GET | `/api/v1/suppliers/:id` | `suppliers.read` |
| POST | `/api/v1/suppliers` | `suppliers.create` |
| PATCH | `/api/v1/suppliers/:id` | `suppliers.update` |
| DELETE | `/api/v1/suppliers/:id` | `suppliers.delete` |
| GET | `/api/v1/suppliers/:id/balance` | `suppliers.read` |
| GET | `/api/v1/suppliers/:id/purchases` | `purchases.read` |
