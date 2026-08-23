# Production cutover — Jerzyfy

Known VM: `45.76.61.16`

| App | Production URL |
| --- | --- |
| Storefront | https://www.jerzyfy.in |
| Admin | https://admin.jerzyfy.in |
| API | https://45-76-61-16.sslip.io |
| Tenant slug | `jerzyfy` |

## 1. Deploy API (after push to main)

```powershell
cd a:\jerzyfy
.\infra\docker\run-production-deploy.ps1
```

Or full deploy:

```powershell
.\infra\docker\deploy.ps1 `
  -PublicIp 45.76.61.16 `
  -ApiHost 45-76-61-16.sslip.io `
  -AcmeEmail frndswork@gmail.com `
  -StorefrontOrigin https://www.jerzyfy.in `
  -AdminOrigin https://admin.jerzyfy.in `
  -SshUser root
```

## 2. Tenant host mapping

```powershell
Get-Content infra\docker\prod-tenant-hosts.sql | `
  .\infra\docker\run-production-deploy.ps1  # or pipe via SSH to psql on VM
```

On VM:

```bash
cd /opt/jersey
docker compose -f infra/docker/docker-compose.api.yml --env-file infra/docker/.env.production exec -T postgres \
  psql -U jersey -d jersey_commerce < infra/docker/prod-tenant-hosts.sql
```

## 3. CORS refresh

```powershell
.\infra\docker\deploy.ps1 `
  -PublicIp 45.76.61.16 `
  -ApiHost 45-76-61-16.sslip.io `
  -AcmeEmail frndswork@gmail.com `
  -StorefrontOrigin https://www.jerzyfy.in `
  -AdminOrigin https://admin.jerzyfy.in `
  -UpdateCorsOnly
```

## 4. Vercel (storefront + admin)

See [../vercel/README.md](../vercel/README.md). Add custom domains in Vercel dashboard:

- Storefront project `jerzyfy`: `www.jerzyfy.in`, `jerzyfy.in`
- Admin project `jerzyfy-admin`: `admin.jerzyfy.in`

## 5. Jerzyfy Staff EXE

```powershell
.\infra\desktop\pack-client.ps1 -ApiUrl "https://45-76-61-16.sslip.io" -ClientName "Jerzyfy"
```

Output: `apps/desktop/dist/Jerzyfy-Staff-Setup-Jerzyfy.exe`

## 6. Smoke

```powershell
Invoke-RestMethod https://45-76-61-16.sslip.io/health
Invoke-RestMethod https://45-76-61-16.sslip.io/ready
```

- https://www.jerzyfy.in — catalog loads, logo in header
- https://admin.jerzyfy.in — login, Website → Branding
- EXE — login, POS sale, ERP live update

Handover: [../../docs/delivery/jerzyfy-handover.md](../../docs/delivery/jerzyfy-handover.md)
