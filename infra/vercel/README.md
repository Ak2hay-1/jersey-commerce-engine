# Vercel projects

## Storefront (`jerzyfy` → www.jerzyfy.in)

- **Root Directory:** `apps/storefront` (required — do not leave as `.`)
- Framework: Next.js (SSR)
- **Install Command:** `npm install --prefix=../..`  
  Do **not** use `cd ../.. && npm install` (causes `Tracker "idealTree" already exists`).
- **Build Command:** `npm run build:packages --prefix=../.. && npm run build`
- Env: `NEXT_PUBLIC_API_URL=https://API_HOST`
- Config in repo: [`apps/storefront/vercel.json`](../../apps/storefront/vercel.json)

Monorepo-root alternative: [`storefront.vercel.json`](./storefront.vercel.json) with Root Directory `.` and `installCommand: npm install`.

## Staff portal (Admin + ERP + POS)

- Root directory: `apps/admin` (uses [`apps/admin/vercel.json`](../../apps/admin/vercel.json))
- Framework: none (static export via custom build)
- Install: `npm install --prefix=../..` (same rule — never `cd ../.. && npm install`)
- Build: `cd ../.. && node infra/vercel/build-admin.mjs`
- Output: `apps/admin/out` (Admin/ERP at `/`, POS nested at `/pos`)
- Env: `NEXT_PUBLIC_API_URL=https://API_HOST` (required)
- Optional: `NEXT_PUBLIC_DEFAULT_TENANT_SLUG`
- Optional: `NEXT_PUBLIC_STOREFRONT_URL=https://www.jerzyfy.in` (Storefront Customizer iframe + “Open live site”)
- Runtime injects `window.__JCE_PUBLIC__ = { apiUrl, portal: "all", storefrontUrl? }`

Monorepo-root alternative config: [`admin.vercel.json`](./admin.vercel.json) (`outputDirectory: apps/admin/out`).

After deploy, put the production staff origin into the API VM `CORS_ORIGINS` together with the storefront origin.
