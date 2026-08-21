# Production cutover (this Vultr box)

Known VM: `45.76.61.16` (password SSH; no key in this environment).

## Blockers in this agent session

- SSH: `Permission denied (publickey,password)` — needs interactive password or an SSH key.
- Vercel CLI: logged out — run `npx vercel login` once.

Code and scripts for hybrid are in the repo. After you push `main`, run the steps below on your machine.

## Temporary HTTPS hostname (no custom domain yet)

[sslip.io](https://sslip.io) maps DNS to the IP so Caddy can get a Let’s Encrypt cert:

`API_HOST=45-76-61-16.sslip.io` → `45.76.61.16`

Replace with your real `api.yourshop.com` when ready.

## 1. Push hybrid code, then deploy API

```powershell
cd a:\jerzyfy
git push origin main   # after committing hybrid changes

.\infra\docker\deploy.ps1 `
  -PublicIp 45.76.61.16 `
  -ApiHost 45-76-61-16.sslip.io `
  -AcmeEmail YOUR_EMAIL@example.com `
  -StorefrontOrigin https://PLACEHOLDER.vercel.app `
  -AdminOrigin https://PLACEHOLDER.vercel.app `
  -SshUser root
```

Expect a downtime window: this switches the VM from the old all-in-one compose to **api + Caddy** only (storefront/admin leave the VM).

Smoke:

```powershell
Invoke-RestMethod https://45-76-61-16.sslip.io/health
```

## 2. Vercel

```powershell
npx vercel login

cd apps/storefront
$env:NEXT_PUBLIC_API_URL = "https://45-76-61-16.sslip.io"
npx vercel --prod

cd ..\admin
$env:NEXT_PUBLIC_API_URL = "https://45-76-61-16.sslip.io"
npx vercel --prod
```

Then refresh CORS with the real Vercel URLs:

```powershell
.\infra\docker\deploy.ps1 `
  -PublicIp 45.76.61.16 `
  -ApiHost 45-76-61-16.sslip.io `
  -AcmeEmail YOUR_EMAIL@example.com `
  -StorefrontOrigin https://YOUR_SHOP.vercel.app `
  -AdminOrigin https://YOUR_ADMIN.vercel.app `
  -UpdateCorsOnly
```

## 3. Staff EXE

```powershell
.\infra\desktop\pack-client.ps1 -ApiUrl "https://45-76-61-16.sslip.io" -ClientName "ClientShop"
```

## 4. Smoke

- Storefront catalog on Vercel  
- Admin login on Vercel  
- EXE: POS sale → ERP Live badge / sales list updates  
