# Delivery pack

How to take Jersey Commerce Engine from a working repo to a **client shop that can take real money**.

Existing domain docs (`docs/architecture.md`, `docs/deployment.md`, `docs/*.md`) describe how the system works. This folder is **how you ship it**.

| Document | Who uses it | When |
| --- | --- | --- |
| [Client checklist](./client-checklist.md) | You + client | Before build, before go-live, after launch |
| [Developer checklist](./developer-checklist.md) | You | Every feature and every release |
| [UAT sign-off](./uat-signoff.md) | Client ticks, you witness | Last day before go-live |
| [Go-live runbook](./go-live-runbook.md) | You | Launch day, in order |
| [Known limitations](./known-limitations.md) | You + client | Put in the SOW before you start |

## Product shape (do not skip)

| App | Role | Typical URL |
| --- | --- | --- |
| Storefront | Customer shop | Vercel URL / custom domain |
| Admin | Website CMS, promo codes, users | Vercel URL / custom domain |
| POS + ERP | Cashier + ops on staff PCs | Install **Jersey Staff** EXE → `https://API_HOST` |
| API | REST + WebSocket | `https://API_HOST/` (Vultr + Caddy) |

Postgres and Redis stay private on the Docker network. OpenAPI `/docs` is off in production.

### Pack staff EXE

```powershell
.\infra\desktop\pack-client.ps1 -ApiUrl "https://API_HOST" -ClientName "ClientShop"
```

Share `apps/desktop/dist/Jersey-Staff-Setup-*.exe` with the client.

### Deploy overview

1. DNS for `API_HOST` → Vultr IP  
2. `.\infra\docker\deploy.ps1 -PublicIp … -ApiHost … -AcmeEmail … -StorefrontOrigin … -AdminOrigin …`  
3. Deploy Storefront + Admin on Vercel ([infra/vercel/README.md](../../infra/vercel/README.md))  
4. Refresh CORS if Vercel URLs changed (`-UpdateCorsOnly`)  
5. Pack and install Jersey Staff EXE  

Full steps: [../deployment.md](../deployment.md) and [./go-live-runbook.md](./go-live-runbook.md).

## Non-negotiable rules

1. Production tenants are **bootstrapped**. Never run `npm run prisma:seed` on the VM.
2. Shop name, logo, colors, products, and domain are **tenant data**, not code.
3. `tenantId` for authorization comes from the JWT only.
4. Sales, payments, and stock movements are **append-only**. Corrections are refund or cancel rows.
5. If money, stock, and reports disagree, you do not ship.

## Related docs

- Deploy: [../deployment.md](../deployment.md)
- Auth and roles: [../auth.md](../auth.md)
- Database and seed warning: [../database.md](../database.md)
- Local setup: [../local-development.md](../local-development.md)
