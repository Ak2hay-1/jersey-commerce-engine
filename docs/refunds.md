# Refunds

Refunds reverse money and, when requested, stock for a completed sale. The original sale and its line items stay in place.

## Lifecycle

```text
COMPLETED sale
    → refund (full or partial)
         → PARTIALLY_REFUNDED (items still refundable)
         → REFUNDED (nothing left)
```

A sale that already has refunds cannot be cancelled; remaining quantity is refunded instead. Cancelled sales cannot be refunded.

## Item quantities

For each sale item:

```text
remaining = quantity sold − quantity already refunded (COMPLETED refunds)
```

A request with `quantity > remaining` is rejected.

Omitting `items` refunds every remaining quantity.

Each refund line stores the original `saleItemId`, quantity, amount, and restock disposition.

## Restock

| `restock` | Inventory |
| --- | --- |
| `RESTOCK` | `RETURN +qty` into sellable stock |
| `DAMAGE` | `RETURN +qty` then `DAMAGE -qty` in the same transaction (net sellable change is zero; the ledger is explicit) |
| `NONE` | No inventory movement (customer keeps the goods) |

## Money

Line refund amounts are proportional shares of the frozen sale item total. Refund payment allocations must equal that item total.

When `payments` is omitted, the engine allocates across remaining original payment balances in proportion. Cash refunds complete immediately. UPI, card, and OTHER refunds require explicit cashier `confirmed: true`. The API does not claim that an external gateway issued the refund.

## Cancellation

`POST /api/v1/pos/sales/:id/cancel` requires `sales.cancel` and a reason. It:

- locks the sale
- reverses remaining items into stock (`RESTOCK`)
- writes refund/reversal payment rows against the original captures
- sets sale status to `CANCELLED`
- keeps the invoice number

Cashiers do not receive `sales.cancel`. Failed attempts are audited.

## Endpoint

`POST /api/v1/pos/sales/:id/refund`

Body:

```json
{
  "reason": "Wrong size",
  "items": [{ "saleItemId": "…", "quantity": 1, "restock": "RESTOCK" }],
  "payments": [{ "paymentId": "…", "amount": "850.00", "confirmed": true }],
  "confirmed": true
}
```

Permissions: `sales.refund` and `payments.refund`.
