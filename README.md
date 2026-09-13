# Jersey Commerce Engine (Jerzyfy)

Production-ready commerce platform for **one shop**: customer storefront, in-store POS, and ERP/admin.

Jerzyfy is operated as a **single-client** product. Branding, catalog, and settings belong to that one shop (seeded as `demo-jersey-store` / display name Jerzyfy). The database still uses an internal `tenantId` column for scoping — that is an implementation detail, not a multi-shop product feature.

This repository currently contains **Phases 1–12** plus the POS cashier app: monorepo layout, authentication, catalog, inventory, POS sales and register UI, payments, CRM, purchasing, the ecommerce order engine, a premium storefront, custom/bulk jersey orders, PostgreSQL/Redis, Prisma domain models, NestJS modules, API versioning, seed data, homepage CMS editing, and documentation. Live payment gateways belong to a later phase.

## Architecture

| Application | Role | Default URL |
| --- | --- | --- |
| `apps/storefront` | Customer storefront | http://localhost:3000 |
| `apps/admin` | Staff portal: Admin + ERP (`NEXT_PUBLIC_PORTAL=all`) | http://localhost:3001 |
| `apps/pos` | Point of sale (nested at `/pos` on Vercel staff portal) | http://localhost:3002 |
| `apps/api` | NestJS backend | http://localhost:4000 |

Shared contracts live in `packages/`. PostgreSQL and Redis run via Docker Compose. See [docs/architecture.md](docs/architecture.md) for the target platform design.

## Technology stack

- Next.js and TypeScript for storefront, admin, and POS
- NestJS and TypeScript for the API
- PostgreSQL and Prisma
- Redis
- Tailwind CSS and shadcn/ui
- Docker Compose
- GitHub Actions CI
- npm workspaces and Turborepo (`turbo.json` is included; local npm scripts orchestrate the pipeline so Windows hosts without the Turbo native binary still work)

## Folder structure

```text
apps/
  storefront/     Customer-facing Next.js app
  admin/          ERP/admin Next.js app
  pos/            POS Next.js app
  api/            NestJS API, Prisma, Swagger
packages/
  ui/             Shared shadcn/ui primitives
  types/          Shared TypeScript contracts
  validation/     Shared Zod schemas
  config/         Ports and environment schemas
  utils/          Logging helpers and utilities
infra/
  docker/         Compose file and Dockerfiles
docs/             Architecture and local development
```

## Local setup

1. Install **Node.js 20+**.
2. Install **Docker Desktop** (required for PostgreSQL and Redis).
3. Copy environment templates (never commit real secrets):

```powershell
copy .env.example .env
copy apps\api\.env.example apps\api\.env
```

4. Install dependencies:

```powershell
npm install
```

5. Start PostgreSQL and Redis:

```powershell
npm run docker:up
```

6. Generate the Prisma client, apply migrations, and load development seed data:

```powershell
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

7. Start applications (separate terminals):

```powershell
npm run dev:api
npm run dev:storefront
npm run dev:admin
npm run dev:pos
```

API documentation: http://localhost:4000/docs  
Liveness: http://localhost:4000/health  
Readiness: http://localhost:4000/ready  
Versioned API: http://localhost:4000/api/v1/...

Details: [docs/local-development.md](docs/local-development.md), [docs/storefront.md](docs/storefront.md), [docs/custom-orders.md](docs/custom-orders.md), and [docs/database.md](docs/database.md).

Client go-live, UAT, and developer definition of done: [docs/delivery/README.md](docs/delivery/README.md).

## Production (Vultr IP, no domain)

From Windows PowerShell, after the repo is public:

```powershell
.\infra\docker\deploy.ps1 -PublicIp YOUR_IP -SshUser root
```

Shop: Vercel storefront · Staff portal (Admin + ERP + POS at `/pos`): Vercel admin project · API: Vultr `https://API_HOST`. See [docs/deployment.md](docs/deployment.md). The Jersey Staff EXE is deprecated.

## Available commands

| Command | Description |
| --- | --- |
| `npm install` | Install workspace dependencies |
| `npm run dev` | Start all apps in parallel |
| `npm run dev:api` | Start the NestJS API |
| `npm run dev:storefront` | Start the storefront on port 3000 |
| `npm run dev:admin` | Start staff Admin+ERP on port 3001 (`NEXT_PUBLIC_PORTAL=all`) |
| `npm run dev:erp` | Legacy: same admin app on port 3003 with `portal=erp` |
| `npm run dev:pos` | Start POS on port 3002 (isolated; production nests under staff `/pos`) |
| `npm run desktop:dev` | **Deprecated** Electron shell (historical packs only) |
| `npm run desktop:pack` | **Deprecated** Windows NSIS installer |
| `npm run build` | Build all packages and applications |
| `npm run typecheck` | TypeScript checks across the workspace |
| `npm run lint` | ESLint across the workspace |
| `npm run format` | Format files with Prettier |
| `npm run test` | API unit tests and storefront Vitest |
| `npm run docker:up` | Start PostgreSQL and Redis |
| `npm run docker:down` | Stop Docker services |
| `npm run prod:up` | Build and start the IP-based production stack |
| `npm run prod:down` | Stop the production stack |
| `npm run prod:logs` | Tail production container logs |
| `npm run prisma:validate` | Validate the Prisma schema |
| `npm run prisma:generate` | Generate the Prisma client |
| `npm run prisma:migrate` | Create/apply Prisma migrations locally |
| `npm run prisma:seed` | Load **development-only** demo data |

## Single-shop rule

Jerzyfy serves **one client**. Do not build multi-shop switching, platform hosting, or tenant marketplaces.

- Default shop slug: `NEXT_PUBLIC_DEFAULT_TENANT_SLUG=demo-jersey-store` (display name: Jerzyfy).
- API: `SINGLE_TENANT_MODE=true` (default) blocks `POST /api/v1/admin/tenants`.
- Frontends: `NEXT_PUBLIC_SINGLE_TENANT=true` (default) pins that shop and hides shop pickers / tenant switchers.
- You may hard-code Jerzyfy brand identity in UI when it improves the product; Website Settings remain available for CMS-driven logos and colors.
- Protected APIs still take shop context from the authenticated JWT (or storefront slug), never from a client-supplied tenant id. See [docs/auth.md](docs/auth.md).
