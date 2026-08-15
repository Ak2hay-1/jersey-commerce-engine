# Local development

## Prerequisites

- Node.js 20 or later (`node -v`)
- npm 11 (bundled with current Node installers)
- Docker Desktop, so `docker compose` is available

Git is recommended. Environment files must never be committed.

## First-time setup

From the repository root:

```powershell
copy .env.example .env
copy apps\api\.env.example apps\api\.env
copy apps\storefront\.env.example apps\storefront\.env.local
copy apps\admin\.env.example apps\admin\.env.local
copy apps\pos\.env.example apps\pos\.env.local
npm install
npm run docker:up
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

`.env` and `.env.local` files are gitignored. Use `.env.example` as the only committed template.

The seed script is **development only**. Demo users all share password `DevPassword123!`. See [database.md](database.md).

## Services

PostgreSQL and Redis are defined in `infra/docker/docker-compose.yml`.

```powershell
npm run docker:up
npm run docker:logs
npm run docker:down
```

Default local ports:

| Service | Port |
| --- | --- |
| Storefront | 3000 |
| Admin | 3001 |
| POS | 3002 |
| API | 4000 |
| PostgreSQL | 5432 |
| Redis | 6379 |

## Run applications

Use separate terminals, or start everything together:

```powershell
npm run dev
```

Or individually:

```powershell
npm run dev:api
npm run dev:storefront
npm run dev:admin
npm run dev:pos
```

The API will start even if PostgreSQL or Redis are down. `GET /health` remains `200`. `GET /ready` returns `503` until both dependencies respond.

## Quality checks

```powershell
npm run prisma:validate
npm run typecheck
npm run lint
npm run test
npm run test:e2e -w @jersey-commerce/api
npm run build
```

## API endpoints available now

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` | Service metadata |
| GET | `/health` | Liveness |
| GET | `/ready` | Readiness of PostgreSQL and Redis |
| GET | `/docs` | Swagger UI |
| GET | `/api/v1/auth/status` | Auth module status |
| POST | `/api/v1/auth/login` | Email/password login |
| POST | `/api/v1/auth/refresh` | Rotate refresh token |
| POST | `/api/v1/auth/logout` | Revoke session |
| GET | `/api/v1/auth/me` | Current user, roles, permissions |
| POST | `/api/v1/auth/change-password` | Change password |
| GET | `/api/v1/tenants/current` | Current tenant |
| GET | `/api/v1/permissions` | Platform permission catalog (authenticated) |
| GET | `/api/v1/{resource}` | Tenant-scoped lists (Bearer token) |

Inventory APIs (`/api/v1/inventory`) are documented in [inventory.md](inventory.md). Auth is documented in [auth.md](auth.md). The ecommerce order engine is documented in [orders.md](orders.md). Suppliers and purchasing are documented in [suppliers.md](suppliers.md) and [purchasing.md](purchasing.md).

Health and readiness stay unversioned so orchestrators can probe without API-prefix knowledge.

## Troubleshooting

- **`DATABASE_URL` validation failed**: copy `apps/api/.env.example` to `apps/api/.env`.
- **Docker commands not found**: install Docker Desktop, restart the terminal, and ensure `docker` is on `PATH`. Until PostgreSQL and Redis are running, `GET /health` stays `200` and `GET /ready` returns `503`.
- **Port already in use**: stop the process bound to 3000–3002, 4000, 5432, or 6379.
- **Prisma client missing**: run `npm run prisma:generate`.
- **Shared package import errors in the API**: run `npm run build:packages` once so `packages/*/dist` exists, or use `npm run dev:api` (it builds packages first).
- **Tenant-scoped 401**: log in via `POST /api/v1/auth/login` and send `Authorization: Bearer <accessToken>`. Client `x-tenant-id` is ignored.
