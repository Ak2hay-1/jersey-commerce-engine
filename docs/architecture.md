# Architecture

## Purpose

Jersey Commerce Engine is a multi-application commerce platform. It includes a customer storefront, POS, ERP/admin, inventory, purchasing, CRM, payments, expenses, reporting, CMS, roles, audit logs, and multi-tenant isolation.

## System shape (hybrid production)

```text
┌─────────────────┐     ┌─────────────────┐
│   Storefront    │     │   Admin panel   │
│   Next.js SSR   │     │   Static SPA    │
│   Vercel        │     │   Vercel        │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │    HTTPS REST + WSS   │
         └───────────┬───────────┘
                     │
            ┌────────▼────────┐
            │  Caddy (TLS)    │  Vultr :443
            │  NestJS API     │  + Postgres + Redis
            └────────┬────────┘
                     ▲
         ┌───────────┴───────────┐
         │                       │
┌────────┴────────┐     ┌────────┴────────┐
│ Jersey Staff    │     │ Jersey Staff    │
│ POS mode        │     │ ERP mode        │
│ Local EXE       │     │ Local EXE       │
└─────────────────┘     └─────────────────┘
```

All HTTP clients talk to one API. The API owns persistence, caching, validation, and realtime invalidation. Clients never connect to Postgres directly.

Legacy all-in-one VM (storefront + admin/POS on the same host) remains in [`infra/docker/docker-compose.prod.yml`](../infra/docker/docker-compose.prod.yml) for reference; preferred path is [`docker-compose.api.yml`](../infra/docker/docker-compose.api.yml).

## Applications

| App | Host | Responsibility |
| --- | --- | --- |
| Storefront | Vercel | Tenant-aware catalog, cart, checkout, accounts, CMS homepage |
| Admin panel (`portal=admin`) | Vercel | Website CMS, promo codes, users, settings |
| ERP (`portal=erp`) | Jersey Staff EXE | Dashboard, sales, inventory, purchasing, CRM, expenses, reports |
| POS | Jersey Staff EXE | Register sales, in-store payments, receipts, refunds |
| API | Vultr (+ Caddy TLS) | Versioned commerce APIs, Prisma, Redis, RBAC, WebSocket |

## Realtime

Staff and storefront clients open `wss://API_HOST/realtime?token=…`. The API publishes invalidate events over Redis so POS sales appear in ERP/Admin without a full page refresh.

## Multi-tenant rule

`tenantId` for authorization comes from the JWT only. Shop branding and catalog are tenant data, not code.
