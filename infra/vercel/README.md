# Vercel projects

## Storefront

- Root directory: `apps/storefront`
- Framework: Next.js (SSR)
- Env: `NEXT_PUBLIC_API_URL=https://API_HOST`
- Optional: use [`storefront.vercel.json`](./storefront.vercel.json) as the project `vercel.json` when configuring from the monorepo root

## Staff portal (Admin + ERP + POS)

- Root directory: `apps/admin` (uses [`apps/admin/vercel.json`](../../apps/admin/vercel.json))
- Framework: none (static export via custom build)
- Build: `node infra/vercel/build-admin.mjs` (from repo root via the app `vercel.json`)
- Output: `apps/admin/out` (Admin/ERP at `/`, POS nested at `/pos`)
- Env: `NEXT_PUBLIC_API_URL=https://API_HOST` (required)
- Optional: `NEXT_PUBLIC_DEFAULT_TENANT_SLUG`
- Runtime injects `window.__JCE_PUBLIC__ = { apiUrl, portal: "all" }`

Monorepo-root alternative config: [`admin.vercel.json`](./admin.vercel.json) (`outputDirectory: apps/admin/out`).

After deploy, put the production staff origin into the API VM `CORS_ORIGINS` together with the storefront origin.
