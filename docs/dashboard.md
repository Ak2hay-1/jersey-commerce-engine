# Dashboard

Phase 12 of the Jersey Commerce Engine. The ERP dashboard lives in `apps/admin` and reads aggregated metrics from `GET /api/v1/dashboard/*`. Business logic stays in the API. The admin UI does not recompute revenue, COGS, or balances from raw tables.

## Architecture

```text
apps/admin  →  DashboardController  →  DashboardService
                                      ├─ SalesReportService
                                      ├─ PaymentReportService
                                      ├─ InventoryReportService
                                      ├─ PurchaseReportService
                                      ├─ CustomerReportService
                                      └─ ExpenseReportService
```

The homepage loads three calls: `/dashboard/summary`, `/dashboard/widgets`, and `/dashboard/revenue`. Related KPIs are bundled so the page does not fan out into dozens of requests.

## Date ranges

All dashboard queries accept `preset` (default `today`) plus optional `from`/`to` for `custom`. Presets are resolved in the **tenant timezone** (default `Asia/Kolkata`):

- `today`, `yesterday`
- `last_7_days`, `last_30_days`
- `this_month`, `last_month`
- `custom`

## KPI formulas

Recognized revenue is:

1. POS `Sale` rows whose status is not `VOIDED` or `CANCELLED`
2. Completed ecommerce `Order` rows with `sale_id IS NULL` (so a POS-linked order is not counted twice)

Custom jersey orders are **not** included in the main revenue KPI. They have their own report.

| KPI | Formula |
| --- | --- |
| Revenue | `SUM(sale.total)` + `SUM(completed order.total where sale_id is null)` |
| COGS | Transaction-time `SUM(cost_price * quantity)` on sale/order lines |
| Gross profit | Revenue − COGS. This is **not** net profit. |
| Margin % | Gross profit / revenue × 100, or `0` when revenue is `0` |
| Orders | Count of recognized documents in the period |
| Average order value | Revenue / completed order count |
| Customers | Customers created in the period |
| Inventory value | Current `SUM(quantity * variant.cost_price)` |
| Outstanding supplier balance | Payable purchase totals − completed supplier payments (current, not period-sliced) |
| Expenses | `SUM` of `ACTIVE` expenses in the period. `VOIDED` rows are excluded. |

Today’s catalog cost is never used to rewrite historical profitability. Line `cost_price` is frozen at transaction time.

## Role experience

`dashboard.read` is required to open the dashboard. Individual cards are omitted when the caller lacks the related permission:

| Role | Typical view |
| --- | --- |
| OWNER | Full KPIs, including gross profit and expenses |
| MANAGER | Same operational metrics except `settings.manage` |
| CASHIER | Sales/POS-focused: revenue, orders, AOV. No gross profit, expenses, or report exports |
| INVENTORY_MANAGER | Inventory valuation, purchasing, stock alerts |
| WEBSITE_MANAGER | Orders/customers/website where permitted; no financial reports |

Frontend navigation uses `filterErpNav(permissions)`. Backend `@RequirePermissions` and per-field checks remain authoritative. Missing permission → **403**.

## Caching

Dashboard summary responses may be cached in Redis for 30 seconds.

Cache keys **must** include tenant identity:

```text
dashboard:{tenantId}:{namespace}:{preset}:{from}:{to}:{userId}
```

Never `dashboard:today`. Cache reads/writes fail open if Redis is unavailable. Keys include `userId` because KPI visibility differs by role.

## Tenant isolation

Every query is scoped to the authenticated `tenantId`. Tenant A cannot read Tenant B revenue, inventory, customers, purchases, expenses, or reports. Isolation is covered in `apps/api/test/phase12.e2e-spec.ts`.
