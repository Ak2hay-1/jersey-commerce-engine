# Client delivery checklist

Use this with the shop owner. Tick in order. Do not start coding until **Before build** is signed. Do not take real money until **Go-live** is signed on [uat-signoff.md](./uat-signoff.md).

---

## Before build

### Contract

- [ ] Scope written: storefront, admin CMS, ERP, POS, what is **out** (see [known-limitations.md](./known-limitations.md)).
- [ ] Go-live definition: first POS sale, first website order, or both.
- [ ] Change requests are paid extras (new reports, payment methods, printers).
- [ ] Data ownership: client owns shop data; you own platform code.
- [ ] Support window, response times, who pays for the VM and backups.
- [ ] Legal: GST, invoices, refund policy, privacy, who is merchant of record.

### Website

- [ ] Legal name, GSTIN, address, phone, WhatsApp, email.
- [ ] Logo, colors, fonts, photo style (runtime branding — never hard-code).
- [ ] Categories, sizes, SKUs, photos, selling price, cost price, tax.
- [ ] Shipping zones, rates, COD vs prepaid, delivery copy.
- [ ] Returns, exchanges, custom/bulk jersey terms.
- [ ] Homepage: hero, featured products, footer, social links.

### ERP and POS

- [ ] Roles: owner, manager, cashier, inventory, website manager.
- [ ] Opening stock count and costing method.
- [ ] Suppliers and purchase/receive flow.
- [ ] In-store tender types (cash, UPI, card). Live online gateways are a later phase.
- [ ] Receipts, refunds, discounts, held carts.
- [ ] Day-1 reports vs later.
- [ ] Hardware: printer, scanner, cash drawer; which PCs get the **Jersey Staff** EXE (POS + ERP).
- [ ] Staff installer packed with shop API URL (`pack-client.ps1`).

### Technical pre-work

- [ ] Host: Vultr (or agreed) VM size, IP vs domain.
- [ ] Secrets never committed; `.env.production` stays on the VM.
- [ ] Backup and restore drill scheduled **before** go-live.
- [ ] Client understands password reset is manual until the email phase.

---

## Before go-live (production-ready)

### Quality

- [ ] CI green on `main` (Prisma validate, typecheck, lint, test, build).
- [ ] Migrations via `prisma migrate deploy` only.
- [ ] `GET /health` and `GET /ready` return 200.
- [ ] `/docs` disabled in production.

### Security

- [ ] Unique JWT, DB, Redis, and bootstrap secrets.
- [ ] Bootstrap used once, then stored offline or cleared.
- [ ] Strong owner password (upper, lower, number, special).
- [ ] Roles least-privilege; SUPER_ADMIN only for you and the client superior admin.
- [ ] CORS locked to Vercel storefront/admin origins and `http://127.0.0.1:39217` (staff EXE). Not `*`.
- [ ] Postgres and Redis not public. Firewall limited to 22 / 80 / 443.
- [ ] If a domain exists: HTTPS, `COOKIE_SECURE=true`, storefront rebuilt with `https://` API URLs.

### Tenant data

- [ ] Shop created with `POST /api/v1/admin/tenants` + `X-Bootstrap-Secret`. **Not seed.**
- [ ] Client superior-admin account created; demo users absent.
- [ ] Website settings: name, logo, theme, footer, contact, policies.
- [ ] Catalog imported: unique SKUs, variants, images, prices, tax.
- [ ] Opening inventory matches the physical count.
- [ ] Document sequences (invoice/receipt) start at the agreed number.
- [ ] Promo codes: live vs test separated.

### Website UAT

- [ ] Browse, search, product page, cart, promo, checkout, confirmation.
- [ ] Custom/bulk enquiry if in scope.
- [ ] Mobile layout; no broken images or links.
- [ ] CMS edits on admin `:3001` show on the storefront.
- [ ] Payment path is honest (COD / pay in store / manual until gateways).

### ERP UAT (staff PC — Jersey Staff EXE, ERP mode)

- [ ] Installer opens; login against the VM API.
- [ ] Dashboard matches a sample sale.
- [ ] Sales, refunds, stock adjust, purchasing, receiving.
- [ ] Customers, expenses, reports.
- [ ] Cashier cannot open reports/settings they must not see.
- [ ] POS sale appears in ERP without a full refresh (use **POS | ERP** switch).

### POS UAT (same EXE, POS mode)

- [ ] Open/close register; cash matches.
- [ ] Lookup, hold, sale, receipt, refund, discount (permission-gated).
- [ ] Staff know what happens if the API is down.

### Handover pack

- [ ] Owner trained: users, CMS, reports, refunds.
- [ ] Cashier trained: POS only.
- [ ] Inventory trained: stock, PO, receiving.
- [ ] Runbook: login, manual password reset, how you deploy updates.
- [ ] Emergency contact when the shop is down.

---

## Go-live day

Follow [go-live-runbook.md](./go-live-runbook.md) in order, then:

- [ ] Maintenance window agreed.
- [ ] Backup taken after import, before first customer.
- [ ] Storefront, admin, API, realtime all reachable.
- [ ] First live POS sale with a real receipt.
- [ ] First live website order (test amount, then refund if needed).
- [ ] Stock after those sales is correct.
- [ ] [UAT sign-off](./uat-signoff.md) signed.
- [ ] Secrets removed from chat.

---

## After go-live (first 30 days)

### Week 1

- [ ] Daily: `/health`, `/ready`, disk, backup job, error logs.
- [ ] One real cashier shift observed.
- [ ] P0 only: cannot sell, cannot login, wrong stock, wrong money.
- [ ] Punch list kept separate from new feature requests.

### Operations

- [ ] Restore tested on a schedule (weekly at first).
- [ ] Updates: pull, migrate, rebuild. Never seed production.
- [ ] After HTTPS: cookies and storefront API URL verified.
- [ ] Audit log reviewed for unexpected admin, refunds, stock adjusts.

### Commercial

- [ ] Credentials handed over; your emergency access documented.
- [ ] Repo, VM, and env-file locations known. Secrets not in git.
- [ ] Warranty vs paid support dates written.
- [ ] Next phase: domain + HTTPS, gateways, email reset, printers.

---

## Minimum production-ready bar

All of these must be true:

1. CI green; production images build.
2. Tenant bootstrapped, not seeded.
3. Secrets unique; `/docs` off; DB/Redis private.
4. Storefront, admin, ERP, POS, and API work on the live tenant.
5. Opening stock and first sale/refund money match reality.
6. Cashier role cannot run the whole company.
7. Backup restore proven.
8. Client trained and [UAT](./uat-signoff.md) signed.
