# Developer checklist (definition of done)

A feature or release is done when a cashier could take **real money** on it tonight. Extra polish without this bar is not a delivery.

Related: [client-checklist.md](./client-checklist.md), [go-live-runbook.md](./go-live-runbook.md), [known-limitations.md](./known-limitations.md).

---

## Release gate (every ship)

Do not tick from memory. Re-run.

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
```

CI on `main` must also: `prisma:generate`, `prisma:validate`, then the four commands above.

You do not ship if any fail:

1. CI is red.
2. Production tenant would need `prisma:seed`.
3. A cashier can see or change what a cashier must not.
4. After sale/refund, money + stock + reports disagree.
5. Backup has never been restored on this stack.
6. Demo identity is still in the UI (shop name, logo, products, colors).

---

## Before you write the feature

- [ ] User is named: customer, cashier, inventory, owner, or website manager.
- [ ] One sentence for done (example: “POS sale decrements stock and shows on the ERP dashboard”).
- [ ] Permission code exists; default roles updated; `@RequirePermissions` on the route.
- [ ] `tenantId` from JWT only. Ignore `?tenantId=` and `x-tenant-id` for authz.
- [ ] Money uses existing helpers / integer minor units. No float prices.
- [ ] Stock and finance writes go through the domain service, not a one-off Prisma update.
- [ ] History is append-only. Corrections are refund or cancel rows.
- [ ] Empty, loading, error, 401, 403, and 404 are designed.

---

## While you code

- [ ] Shared types in `packages/types`, schemas in `packages/validation`.
- [ ] API envelope `{ success, data }` or `{ success: false, error: { code, message, details, timestamp, path, requestId } }`.
- [ ] No `any`, no leftover `console.log`, no secrets in source.
- [ ] Env through `packages/config` schemas.
- [ ] Uploads validated (type and size) before storage.
- [ ] Lists paginated. No unbounded `findMany`.
- [ ] Checkout, payments, and POS sales are safe under retry (idempotent or locked).
- [ ] After a write, publish realtime invalidation; UI refetches REST. WebSocket is not the source of truth.
- [ ] Storefront branding from tenant `WebsiteSettings`, not hard-coded CSS.

---

## Tests you must be able to explain

| Area | Prove |
| --- | --- |
| Auth | Invalid login message is identical; refresh rotates; logout denylists access JWT |
| RBAC | Cashier 403 on reports/settings; manager cannot assign OWNER |
| Tenant | Tenant A cannot read Tenant B (404, not an existence leak) |
| Catalog | SKU unique per tenant; slug stable |
| Inventory | Reserve → sell → refund restores; no silent negative stock |
| POS | Open session → sale → frozen receipt → close; cash matches |
| Orders | Status machine rejects illegal jumps; cancel releases stock |
| Promo | Expired / min spend / usage limit rejected |
| Checkout | Redis lock; double submit does not double-create |
| Money | Tax + discount + shipping + lines = header total |
| Reports | Dashboard sums the ledger, not live catalog price |
| Backup | Paths stay inside `BACKUP_ALLOWED_ROOT` |

---

## Click-through on a fresh tenant

Not the seeded demo shop.

### API

- [ ] `GET /health` 200, `GET /ready` 200.
- [ ] `/docs` off when `NODE_ENV=production`.
- [ ] Routes under `/api/v1/...`.
- [ ] Logs redact `Authorization`.
- [ ] Login rate limit returns 429.

### Storefront

- [ ] Home, catalog, PDP, cart, promo, checkout, confirmation.
- [ ] Custom/bulk enquiry if in scope.
- [ ] Mobile and desktop; images intact.
- [ ] CMS change appears without redeploy.
- [ ] Human copy for 404, empty cart, sold out, failed checkout.
- [ ] `NEXT_PUBLIC_API_URL` correct. Storefront **bakes this at image build**. IP change = rebuild storefront.

### Staff portal (`NEXT_PUBLIC_PORTAL=all` on Vercel)

- [ ] Login, refresh, logout, password change.
- [ ] Homepage / footer / branding save.
- [ ] Promo codes and users within role rules.
- [ ] Website manager cannot open ERP finance screens.
- [ ] Dashboard equals a sale you just made.
- [ ] Sales, refunds, stock, PO, receive, suppliers, customers, expenses, reports, CSV.
- [ ] Missing `[id]` routes do not 500.
- [ ] Nav matches role (`erp-nav` tests stay true); **Sales → Register** opens `/pos/`.
- [ ] POS: search, qty, hold, recall, pay, receipt HTML, refund; register open/close.
- [ ] ERP updates live after a POS sale (same origin SSO).
- [ ] `runtime-config.js` points at the live API (`portal:"all"`).

### Vercel frontends

- [ ] Storefront project: `NEXT_PUBLIC_API_URL=https://API_HOST`.
- [ ] Staff (admin) project: build-admin.mjs nests POS at `/pos` with `portal=all`.
- [ ] Both origins listed in VM `CORS_ORIGINS` (no desktop `127.0.0.1:39217` required).

---

## Production config

- [ ] `.env.production` not in git. JWT secrets ≥ 32 characters.
- [ ] `API_HOST` DNS points at the VM; Caddy serves HTTPS.
- [ ] `CORS_ORIGINS` lists Vercel shop and Vercel staff portal.
- [ ] `COOKIE_SECURE=true` on the hybrid API.
- [ ] Postgres and Redis not published.
- [ ] Firewall: 22, 80, 443.
- [ ] Empty `BOOTSTRAP_SECRET` → bootstrap route 404 after the first shop.
- [ ] `prisma migrate deploy` on boot. Never seed the VM.
- [ ] First shop: `POST /api/v1/admin/tenants` + `X-Bootstrap-Secret`.
- [ ] Client OWNER / SUPER_ADMIN created; bootstrap secret removed from chat.

---

## Money and stock (calculator, once per release)

```text
qty × unit − discount + tax + shipping = payable
payable = sum(payments) − sum(refunds)
stock after = stock before − sold + refunded + received − adjusted
```

- [ ] Opening stock = physical count.
- [ ] Movements store `unitCost` at the time of the move.
- [ ] Invoice/receipt sequences unique per tenant; never reused after cancel.
- [ ] Payment amounts immutable; refunds are new rows.
- [ ] Tax inclusive/exclusive consistent on storefront, POS, and reports.
- [ ] One promo + discount + tax example matches paper, UI, and DB.

If the three equations disagree, stop.

---

## Security pass (every release)

- [ ] No client-supplied tenant id used for authorization.
- [ ] Swap another tenant’s order/customer id → 404.
- [ ] Cashier token cannot hit `reports.*`, `settings.manage`, `users.manage`.
- [ ] Cannot deactivate the last superior admin; cannot self-escalate role.
- [ ] Uploads: size cap, content-type check, no scriptable SVG.
- [ ] Persistence stays in Prisma. No concatenated SQL.
- [ ] Client bundles contain only `NEXT_PUBLIC_*`.
- [ ] Helmet on; refresh cookie httpOnly; refresh reuse detection on.

---

## Operability

- [ ] Scheduled backup ran; restore into a throwaway database succeeded.
- [ ] Disk and logs will not fill the VM; swap present on 4 GB hosts.
- [ ] `.\infra\docker\deploy.ps1 -PublicIp ... -SkipSetup` dry-run once.
- [ ] Rollback: previous image and previous migration written down.
- [ ] Uptime ping on `/health`.
- [ ] [Known limitations](./known-limitations.md) listed in the client SOW.

---

## Definition of done — one ticket

1. Code, types, and validation updated.
2. Permission and tenant isolation respected.
3. Unit or e2e covers money or state machine if any.
4. Path clicked on storefront and/or ERP/POS.
5. Empty / error / forbidden UI exists.
6. `docs/*.md` updated if behavior changed.
7. Feature demos on a bootstrapped tenant, not seed data.

---

## Definition of done — the product

- [ ] `npm run test` and `npm run build` pass on `main`.
- [ ] Fresh production tenant created without seed.
- [ ] Owner, cashier, inventory, and website manager each logged in once.
- [ ] One POS sale + one web order + one refund + one PO receive — reports match.
- [ ] Homepage is the client’s, not the demo.
- [ ] Backup restored successfully.
- [ ] Secrets rotated out of chat.
- [ ] [UAT sign-off](./uat-signoff.md) signed; limitations listed.
