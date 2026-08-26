# Delivery pack

How Rkyves takes a working product from repo to a **client that can operate and grow** — then keeps shipping updates safely.

Company context: [../rkyves/BUSINESS-CONTEXT.md](../rkyves/BUSINESS-CONTEXT.md).  
Domain docs (`docs/architecture.md`, `docs/deployment.md`, `docs/*.md`) describe how the system works. This folder is **how you ship and operate it**.

## New client kit (order)

1. [../rkyves/BUSINESS-CONTEXT.md](../rkyves/BUSINESS-CONTEXT.md) — what Rkyves is and how we build  
2. [Client checklist](./client-checklist.md) — before build / before go-live  
3. [Developer checklist](./developer-checklist.md) — every feature and release gate  
4. [Known limitations](./known-limitations.md) — freeze in the SOW  
5. [Go-live runbook](./go-live-runbook.md) — launch day (hybrid commerce)  
6. [UAT sign-off](./uat-signoff.md) — last day before real money  
7. [Client handover template](./CLIENT-HANDOVER-TEMPLATE.md) — fill once per client  
8. **Forever after:** [Release & Ops Playbook](./RELEASE-OPS-PLAYBOOK.md) — every bug fix, update, incident  

| Document | Who | When |
| --- | --- | --- |
| [RELEASE-OPS-PLAYBOOK.md](./RELEASE-OPS-PLAYBOOK.md) | You | Every release, hotfix, incident |
| [CLIENT-HANDOVER-TEMPLATE.md](./CLIENT-HANDOVER-TEMPLATE.md) | You | Copy and fill at go-live |
| [jerzyfy-handover.md](./jerzyfy-handover.md) | You | Filled example (Jerzyfy) |
| [Client checklist](./client-checklist.md) | You + client | Before build, before go-live, after launch |
| [Developer checklist](./developer-checklist.md) | You | Every feature and every release |
| [UAT sign-off](./uat-signoff.md) | Client ticks, you witness | Last day before go-live |
| [Go-live runbook](./go-live-runbook.md) | You | Launch day, in order |
| [Known limitations](./known-limitations.md) | You + client | Put in the SOW before you start |

## Product shape (hybrid commerce — do not skip)

| App | Role | Typical URL |
| --- | --- | --- |
| Storefront | Customer shop | Vercel URL / custom domain |
| Staff portal | Admin CMS + ERP + POS (`/pos`) | Vercel URL / custom domain |
| API | REST + WebSocket | `https://API_HOST/` (Vultr + Caddy) |

Postgres and Redis stay private on the Docker network. OpenAPI `/docs` is off in production.

Other Rkyves engagements (site-only, ops-only) use the product-type matrices in [RELEASE-OPS-PLAYBOOK.md](./RELEASE-OPS-PLAYBOOK.md) §3.

The Jersey Staff Windows EXE is **deprecated**. Staff use the browser portal only.

### Deploy overview

1. DNS for `API_HOST` → Vultr IP  
2. `.\infra\docker\deploy.ps1 -PublicIp … -ApiHost … -AcmeEmail … -StorefrontOrigin … -AdminOrigin …`  
3. Deploy Storefront + Staff portal on Vercel ([infra/vercel/README.md](../../infra/vercel/README.md))  
4. Refresh CORS if Vercel URLs changed (`-UpdateCorsOnly`)  

Full first launch: [../deployment.md](../deployment.md) and [./go-live-runbook.md](./go-live-runbook.md).  
Every later update: [./RELEASE-OPS-PLAYBOOK.md](./RELEASE-OPS-PLAYBOOK.md).

## Non-negotiable rules

1. Production tenants are **bootstrapped**. Never run `npm run prisma:seed` on the VM.
2. Shop name, logo, colors, products, and domain are **tenant data**, not code.
3. `tenantId` for authorization comes from the JWT only.
4. Sales, payments, and stock movements are **append-only**. Corrections are refund or cancel rows.
5. If money, stock, and reports disagree, you do not ship.
6. Prefer reusable core + modules over client-specific hardcoding ([../rkyves/BUSINESS-CONTEXT.md](../rkyves/BUSINESS-CONTEXT.md)).

## Related docs

- Rkyves company: [../rkyves/README.md](../rkyves/README.md)
- Deploy: [../deployment.md](../deployment.md)
- Auth and roles: [../auth.md](../auth.md)
- Database and seed warning: [../database.md](../database.md)
- Local setup: [../local-development.md](../local-development.md)
