# Expenses

Phase 12 operating-expense module. Expenses are financial records, not a general ledger. There is no GST filing, payroll, or chart of accounts in this phase.

## Model

`Expense` belongs to a tenant and an `ExpenseCategory`. Categories seeded for every new tenant:

Rent, Electricity, Salary, Transport, Marketing, Packaging, Maintenance, Miscellaneous.

`Expense.status` is `ACTIVE` or `VOIDED`. Historical rows are never deleted.

## HTTP

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/api/v1/expenses` | `expenses.read` |
| GET | `/api/v1/expenses/categories` | `expenses.read` |
| GET | `/api/v1/expenses/:id` | `expenses.read` |
| POST | `/api/v1/expenses` | `expenses.create` |
| PATCH | `/api/v1/expenses/:id` | `expenses.update` |
| DELETE | `/api/v1/expenses/:id` | `expenses.delete` (voids the row) |

`DELETE` sets `status=VOIDED`, `voidedAt`, `voidedById`, and `voidReason`. Totals and the expense report include only `ACTIVE` rows.

Voided expenses cannot be edited.

## Audit

| Action | When |
| --- | --- |
| `expenses.created` | Create |
| `expenses.updated` | Patch of an active row |
| `expenses.voided` | Void |

Dashboard/report **views** are not audited. Exports are audited separately (`reports.exported`).

## RBAC

OWNER and MANAGER receive expense permissions through the catalog (MANAGER has all codes except `settings.manage`). CASHIER, INVENTORY_MANAGER, and WEBSITE_MANAGER do not receive `expenses.*` by default. Unauthorized callers receive **403**.

## Admin

- `/expenses` list
- `/expenses/new` create
- `/expenses/:id` edit / void
- `/reports/expenses` totals, category breakdown, trend, CSV export
