# Architecture

## Purpose

Jersey Commerce Engine is a multi-application commerce platform. It includes a customer storefront, POS, ERP/admin, inventory, purchasing, CRM, payments, expenses, reporting, CMS, roles, audit logs, and multi-tenant isolation.

## System shape (hybrid production)

```text
┌─────────────────┐     ┌─────────────────┐
│   Storefront    │     │  Staff portal   │
│   Next.js SSR   │     │  Static SPA     │
│   Vercel        │     │  Vercel         │
└────────┬────────┘     │  Admin+ERP+/pos │
         │              └────────┬────────┘
         │                       │
         │    HTTPS REST + WSS   │
         └───────────┬───────────┘
                     │
            ┌────────▼────────┐
            │  Caddy (TLS)    │  Vultr :443
            │  NestJS API     │  + Postgres + Redis
            └─────────────────┘
```

All HTTP clients talk to one API. The API owns persistence, caching, validation, and realtime invalidation. Clients never connect to Postgres directly.

The staff portal is one Vercel static site: Admin + ERP (`NEXT_PUBLIC_PORTAL=all`) at the root, with POS nested at `/pos`. The Jersey Staff Windows EXE is **deprecated**.

Legacy all-in-one VM (storefront + admin/POS on the same host) remains in [`infra/docker/docker-compose.prod.yml`](../infra/docker/docker-compose.prod.yml) for reference; preferred path is [`docker-compose.api.yml`](../infra/docker/docker-compose.api.yml).

## Applications

| App | Host | Responsibility |
| --- | --- | --- |
| Storefront | Vercel | Tenant-aware catalog, cart, checkout, accounts, CMS homepage |
| Staff portal (`portal=all`) | Vercel | Website CMS, promo codes, users, settings, dashboard, sales, inventory, purchasing, CRM, expenses, reports; POS at `/pos` |
| API | Vultr (+ Caddy TLS) | Versioned commerce APIs, Prisma, Redis, RBAC, WebSocket |

`apps/admin` and `apps/pos` remain separate Next apps in the monorepo; the Vercel staff build nests the POS export under `/pos`. Local `dev:admin` with `portal=all` matches production; `dev:pos` is for isolated POS work.

## Realtime

Staff and storefront clients open `wss://API_HOST/realtime?token=…`. The API publishes invalidate events over Redis so POS sales appear in the staff portal without a full page refresh.

## Multi-tenant rule

`tenantId` for authorization comes from the JWT only. Shop branding and catalog are tenant data, not code.
