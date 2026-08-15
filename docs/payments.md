# Payments

Payments are recorded against sales through a provider abstraction. No card numbers, CVV, PINs, or magnetic-stripe data are stored.

## Architecture

```text
PaymentProcessor
    ├── CashPaymentProvider
    ├── ManualUpiPaymentProvider
    ├── CardPaymentProvider
    ├── OtherPaymentProvider
    └── OnlinePaymentProvider   (not configured; never reports success)
```

The unconfigured ONLINE adapter never reports success. Ecommerce checkout creates a PENDING payment intent through `PaymentGateway` instead of calling `PaymentProcessor.capture`. See [orders.md](orders.md).

## Methods and statuses

Methods: `CASH`, `UPI`, `CARD`, `ONLINE`, `OTHER`.

Statuses: `PENDING`, `COMPLETED`, `FAILED`, `CANCELLED`, `REFUNDED`, `PARTIALLY_REFUNDED`.

## Capture rules

| Method | Completes when | Required fields |
| --- | --- | --- |
| CASH | Cashier records tender | `amountReceived >= amount`. Change is `amountReceived - amount`. |
| UPI | Cashier sets `confirmed: true` | Transaction `reference`. Metadata records `gatewayConfirmed: false`. |
| CARD | Cashier sets `confirmed: true` | Terminal/approval `reference`. Sensitive keys are stripped. |
| OTHER | Cashier sets `confirmed: true` | Optional reference. |
| ONLINE | Never in this phase | A gateway must exist before success can be recorded. |

Split payments are allowed. The sum of completed payment amounts must equal the sale total. Cash over-tender is change, not overpayment of the sale.

Duplicate UPI/card references are rejected per tenant and method for in-flight and captured payments.

## Lifecycle

1. POS completion prepares captures, then inserts `Payment` rows in the same sale transaction.
2. `POST /api/v1/payments` can record an additional capture only when a sale still has an unpaid remainder (POS sales in this phase are fully paid at completion).
3. Refunds and cancellations do not delete original payments. They add refund payment rows and move the original status to `PARTIALLY_REFUNDED` or `REFUNDED`.

## Endpoints

- `POST /api/v1/payments`
- `GET /api/v1/payments`
- `GET /api/v1/payments/:id`

List filters: date range, method, status, cashier, POS session, invoice number, reference. Tenant id always comes from the JWT.

## Permissions

| Permission | Typical roles |
| --- | --- |
| `payments.read` | Owner, manager, cashier, inventory manager |
| `payments.create` | Owner, manager, cashier |
| `payments.refund` | Owner, manager, cashier |

Website managers have no payment APIs.

## Audit

Logged actions include payment creation, failure, cancellation, cashier UPI confirmation, and discounts applied on the way to the sale. Card secrets are never written to audit metadata.
