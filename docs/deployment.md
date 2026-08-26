# Production deploy (hybrid)

**Preferred shape:** Storefront + **unified staff portal** (Admin + ERP + POS) on **Vercel**, API + Postgres + Redis on a **Vultr** VM behind **Caddy HTTPS**. The Jersey Staff Windows EXE is deprecated.

Public repo: https://github.com/Ak2hay-1/jersey-commerce-engine.git

| App | URL | Notes |
| --- | --- | --- |
| Storefront | Vercel project URL / custom domain | Next.js SSR; bake `NEXT_PUBLIC_API_URL=https://API_HOST` |
| Staff portal | Vercel project URL / custom domain | Static export; `portal=all` + POS nested at `/pos` |
| API | `https://API_HOST/` | Caddy → Nest on the VM |
| Realtime | `wss://API_HOST/realtime` | WebSocket (JWT query `token`) |
| Health | `https://API_HOST/health` | Liveness |

Postgres and Redis stay private on the Docker network. OpenAPI `/docs` is off in production.

Detailed Vercel steps: [../infra/vercel/README.md](../infra/vercel/README.md).

Cutover checklist for an existing Vultr box: [../infra/docker/PRODUCTION-CUTOVER.md](../infra/docker/PRODUCTION-CUTOVER.md).

Without a custom domain yet, you can use [sslip.io](https://sslip.io) so Let’s Encrypt works, e.g. `API_HOST=45-76-61-16.sslip.io` for IP `45.76.61.16`.

---

## 1. DNS

Point an A (and optional AAAA) record for `API_HOST` (e.g. `api.yourshop.com`) at the Vultr IPv4 **before** starting Caddy so Let’s Encrypt can issue a certificate.

---

## 2. Deploy the API VM (from Windows PowerShell)

```powershell
cd a:\jerzyfy
.\infra\docker\deploy.ps1 `
  -PublicIp YOUR_IP `
  -ApiHost api.yourshop.com `
  -AcmeEmail you@example.com `
  -StorefrontOrigin https://your-shop.vercel.app `
  -AdminOrigin https://your-admin.vercel.app `
  -SshUser root
```

With a key:

```powershell
.\infra\docker\deploy.ps1 `
  -PublicIp YOUR_IP `
  -ApiHost api.yourshop.com `
  -AcmeEmail you@example.com `
  -StorefrontOrigin https://your-shop.vercel.app `
  -AdminOrigin https://your-admin.vercel.app `
  -SshUser root `
  -SshKey $env:USERPROFILE\.ssh\id_ed25519
```

The script clones the repo to `/opt/jersey`, installs Docker if needed, writes `.env.production` (secrets printed once), and runs `prod-up.sh` (builds **api**, starts postgres/redis/api/caddy).

Firewall opens **22, 80, 443** (plus legacy ports if left from older setups).

Later API-only updates:

```powershell
.\infra\docker\deploy.ps1 `
  -PublicIp YOUR_IP `
  -ApiHost api.yourshop.com `
  -AcmeEmail you@example.com `
  -StorefrontOrigin https://your-shop.vercel.app `
  -AdminOrigin https://your-admin.vercel.app `
  -SshUser root `
  -SkipSetup
```

After Vercel URLs change, refresh CORS without a full rebuild:

```powershell
.\infra\docker\deploy.ps1 ... -UpdateCorsOnly
```

---

## 3. Prove the API is up

```powershell
Invoke-RestMethod "https://API_HOST/health"
Invoke-RestMethod "https://API_HOST/ready"
```

---

## 4. Deploy Storefront and Staff portal on Vercel

1. Create two Vercel projects from this monorepo.
2. Storefront: root `apps/storefront`, env `NEXT_PUBLIC_API_URL=https://API_HOST`.
3. Staff (Admin app root): root `apps/admin`, env `NEXT_PUBLIC_API_URL=https://API_HOST`. The build (`infra/vercel/build-admin.mjs`) writes `runtime-config.js` with `portal:"all"` and nests the POS static export under `/pos`.
4. Deploy both; put their production origins into `CORS_ORIGINS` (`-UpdateCorsOnly` if needed). Do **not** require `http://127.0.0.1:39217`.

See [infra/vercel/README.md](../infra/vercel/README.md).

---

## 5. Bootstrap the shop

```powershell
$api = "https://API_HOST"
$bootstrap = "BOOTSTRAP_SECRET_PRINTED_BY_DEPLOY"
$body = @{
  name          = "Client Shop Name"
  slug          = "client-shop-slug"
  ownerEmail    = "owner@client.example"
  ownerPassword = "ChangeMe1!"
  ownerName     = "Store Owner"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri "$api/api/v1/admin/tenants" `
  -Headers @{ "X-Bootstrap-Secret" = $bootstrap } `
  -ContentType "application/json" `
  -Body $body
```

Never run `npm run prisma:seed` on the VM.

Staff sign in at the Vercel staff URL (CMS, ERP, and **Sales → Register** for POS).

---

## Legacy all-in-one VM

[`docker-compose.prod.yml`](../infra/docker/docker-compose.prod.yml) still builds storefront + nginx admin/POS on the same host (HTTP IP). Prefer the hybrid path above for new shops. Local npm scripts: `npm run prod:full:up` / `prod:full:down`.

The Jersey Staff EXE under `apps/desktop` is **deprecated** and is not part of go-live.

---

## Cookies and CORS

Hybrid API defaults: `COOKIE_SECURE=true`, `COOKIE_SAMESITE=none` (cross-site staff refresh cookie if used). Staff UIs also send refresh tokens in the JSON body / `localStorage`. `CORS_ORIGINS` must list every browser origin (Vercel shop and Vercel staff portal).
