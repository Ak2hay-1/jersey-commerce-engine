# UAT sign-off

Print or copy this page. Client ticks **Pass** or **Fail**. Failures block go-live unless both parties initial a waiver.

| Field | Value |
| --- | --- |
| Shop / tenant name | |
| Production IP or domain | |
| Date | |
| Developer | |
| Client name and role | |

Known gaps that are **not** bugs: [known-limitations.md](./known-limitations.md).

---

## Access

| # | Check | Pass | Fail | Notes |
| --- | --- | --- | --- | --- |
| A1 | Owner logs in at the staff portal (Vercel) | | | |
| A2 | ERP screens (dashboard, sales, inventory) are available in the same portal | | | |
| A3 | POS opens via **Sales → Register** (`/pos/`) and reaches the API without a second login | | | |
| A4 | Cashier **cannot** open reports or settings | | | |
| A5 | Website manager can edit CMS, not financial reports | | | |
| A6 | Logout works; a second device can be kicked by password change | | | |

## Storefront

| # | Check | Pass | Fail | Notes |
| --- | --- | --- | --- | --- |
| W1 | Shop name, logo, and colors are this client’s | | | |
| W2 | Catalog, prices, and images are correct | | | |
| W3 | Add to cart, promo code, checkout complete | | | |
| W4 | Order appears in ERP | | | |
| W5 | Mobile layout acceptable | | | |
| W6 | CMS edit on admin appears on the shop | | | |
| W7 | Custom/bulk enquiry works **or** marked N/A | | | |
| W8 | Payment method shown matches what the shop actually offers | | | |

## POS

| # | Check | Pass | Fail | Notes |
| --- | --- | --- | --- | --- |
| P1 | Open register | | | |
| P2 | Find product, sell, print/view receipt | | | |
| P3 | Hold and recall a cart | | | |
| P4 | Refund a line; stock returns | | | |
| P5 | Close register; cash expected matches | | | |

## ERP

| # | Check | Pass | Fail | Notes |
| --- | --- | --- | --- | --- |
| E1 | Dashboard matches the POS sale and web order above | | | |
| E2 | Stock after sale and refund matches physical | | | |
| E3 | Create PO, receive stock, stock increases | | | |
| E4 | Customer record and history look right | | | |
| E5 | Expense can be recorded | | | |
| E6 | At least one report / CSV export is usable | | | |

## Money (one worked example)

Write the numbers. They must match the UI and a calculator.

| | Amount |
| --- | --- |
| Line goods | |
| Discount | |
| Tax | |
| Shipping (web only) | |
| Payable | |
| Paid | |
| Refunded | |
| Net | |

- [ ] Payable = paid − refunded
- [ ] Reports show the same net

## Ops

| # | Check | Pass | Fail | Notes |
| --- | --- | --- | --- | --- |
| O1 | `http://YOUR_IP:4000/health` returns 200 | | | |
| O2 | Client has owner credentials (not demo passwords) | | | |
| O3 | Client knows how to reach you if the shop is down | | | |
| O4 | Limitations in [known-limitations.md](./known-limitations.md) were explained | | | |

---

## Waivers

List Fail items that will go live anyway, with a date to fix.

| ID | Issue | Fix by | Client initials | Dev initials |
| --- | --- | --- | --- | --- |
| | | | | |

---

## Sign

We accept this tenant as ready for live sales, subject to the waivers above.

| | Signature | Date |
| --- | --- | --- |
| Client | | |
| Developer | | |
