# Reports

Phase 12 reporting engine. Calculations run in PostgreSQL (`SUM`, `COUNT`, `AVG`, `GROUP BY`, `DATE_TRUNC`) inside dedicated services. Controllers do not compute metrics.

## Architecture

| Service | Responsibility |
| --- | --- |
| `ReportingScopeService` | Resolve tenant timezone + date range |
| `SalesReportService` | Recognized sales/orders, COGS, gross profit, channels, top products, revenue series |
| `InventoryReportService` | On-hand, reserved, available, valuation, low/out of stock |
| `PurchaseReportService` | Purchase totals, supplier outstanding, top suppliers |
| `CustomerReportService` | New / repeat / high-value / inactive / top spenders |
| `PaymentReportService` | Cash, UPI, card, online, other, refunds |
| `ExpenseReportService` | Active expenses by category and trend |
| `CustomOrderReportService` | Enquiry → quote → production funnel |

## HTTP

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/api/v1/reports/sales` | `reports.read` |
| GET | `/api/v1/reports/sales/export` | `reports.export` |
| GET | `/api/v1/reports/inventory` | `inventory.read` |
| GET | `/api/v1/reports/inventory/export` | `reports.export` + `inventory.read` |
| GET | `/api/v1/reports/purchases` | `purchases.read` |
| GET | `/api/v1/reports/purchases/export` | `reports.export` + `purchases.read` |
| GET | `/api/v1/reports/customers` | `customers.read` |
| GET | `/api/v1/reports/customers/export` | `reports.export` + `customers.read` |
| GET | `/api/v1/reports/payments` | `payments.read` |
| GET | `/api/v1/reports/payments/export` | `reports.export` + `payments.read` |
| GET | `/api/v1/reports/expenses` | `expenses.read` |
| GET | `/api/v1/reports/expenses/export` | `reports.export` + `expenses.read` |
| GET | `/api/v1/reports/custom-orders` | `customOrders.read` |
| GET | `/api/v1/reports/custom-orders/export` | `reports.export` + `customOrders.read` |

Admin routes: `/reports`, `/reports/sales`, `/reports/inventory`, `/reports/purchases`, `/reports/customers`, `/reports/payments`, `/reports/expenses`, `/reports/custom-orders`.

Filters that the caller is not allowed to use are ignored or rejected by the API. The UI hides unauthorized report links via `filterErpNav`.

## Gross profit

```text
Gross profit = Revenue − COGS
Margin %     = Gross profit / Revenue × 100
```

COGS uses the `cost_price` stored on `sale_items` / `order_items` at checkout. Do not reprice history from the current variant cost.

This is **gross** profit only. Net profit would require a full ledger (later phase).

## Inventory valuation

Current snapshot (not period-sliced):

- Stock = `inventories.quantity`
- Reserved = `inventories.reserved_quantity`
- Available = `quantity - reserved_quantity`
- Cost value = `quantity * variant.cost_price`
- Selling value = `quantity * variant.selling_price`

Low stock: `reorder_level > 0` and `0 < quantity <= reorder_level`. Out of stock: `quantity = 0`.

## Exports

CSV is implemented for major tabular reports. Excel and PDF are reserved for a later phase.

Exports:

- Use the same date/source/payment filters as the on-screen report
- Are tenant-scoped
- Require `reports.export` **and** the domain read permission
- Are audited as `reports.exported`

The success interceptor does not wrap `StreamableFile` responses. Clients receive `text/csv`.
