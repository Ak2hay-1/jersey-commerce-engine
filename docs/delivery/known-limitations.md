# Known limitations

Put this list in the SOW **before** build. A honest delivery names these. Pretending they are done is how UAT fails.

Platform design: [../architecture.md](../architecture.md). Auth: [../auth.md](../auth.md). Deploy: [../deployment.md](../deployment.md).

---

## Not in this phase

| Item | What the client sees today | When it changes |
| --- | --- | --- |
| Live payment gateways | Online prepaid capture is not wired. Use COD, pay-in-store, or record payment in ERP/POS. | Later payments phase |
| Forgot / reset password email | `PasswordResetToken` exists; no public reset endpoints. Owner or superior admin sets a **temporary password** in Admin → Users; that staff member must change it on next sign-in. | Email phase |
| Domain + HTTPS | Hybrid production uses `API_HOST` + Caddy TLS and Vercel HTTPS frontends. Legacy IP-only HTTP stack is optional (`docker-compose.prod.yml`). | Custom shop/admin domains on Vercel when the client is ready |
| Hardware printers | Receipts are frozen HTML payloads. No ESC/POS / cash drawer drivers. | Hardware phase |
| WhatsApp / email campaigns | Order channels may exist as data; marketing sends are not a productized campaign tool. | Messaging phase |
| Public tenant signup | Shops are created with `POST /api/v1/admin/tenants` + `X-Bootstrap-Secret`. Empty secret → 404. | If you ever productize self-serve |

---

## Deploy behavior you must remember

| Fact | Consequence |
| --- | --- |
| Storefront bakes `NEXT_PUBLIC_*` at **Vercel build** | Changing `API_HOST` requires a storefront redeploy on Vercel |
| Admin ships `runtime-config.js` / bake-time API URL at Vercel build | Changing API URL requires an admin redeploy (or update the generated config in CI) |
| OpenAPI `/docs` is off in production | Use staging or local for API exploration |
| `npm run prisma:seed` is development only | Demo password `DevPassword123!` must never exist in production |
| Financial history is append-only | You do not “edit yesterday’s sale.” You refund, cancel, or adjust stock with a movement |

---

## Role boundaries (not bugs)

From [../auth.md](../auth.md):

- **SUPER_ADMIN** — all permissions. Hidden from other roles. Only another superior admin can assign it.
- **OWNER** — all catalog codes. Cannot be assigned by a manager.
- **MANAGER** — no `settings.manage`. Cannot assign OWNER or SUPER_ADMIN.
- **CASHIER** — POS and sales create/refund; no reports, expenses, or `sales.discount` unless you change the map.
- **INVENTORY_MANAGER** — stock and purchasing; no expenses or reports.
- **WEBSITE_MANAGER** — CMS, promo codes, product read/write, orders; no inventory modification or financial reports.

If the client wants a cashier who can see daily sales totals, that is a **scope change**, not a defect.

---

## How to talk about it

Use this sentence in kickoff and UAT:

> The shop can take in-store POS sales (Jersey Staff EXE) and website orders (Vercel storefront) against the Vultr API. Online card capture, customer password-reset email, and physical receipt printers are listed as later work and are not part of this go-live.
