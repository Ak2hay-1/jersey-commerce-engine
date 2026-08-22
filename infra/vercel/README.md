# Vercel deploy (hybrid production)

Storefront and Admin are separate Vercel projects. The API stays on Vultr (`https://API_HOST`).

## Why the first deploy failed

Running `npx vercel` **inside** `apps/storefront` only uploads that folder (~183 files). Then `cd ../.. && npm install` hits npm’s `idealTree already exists` / missing workspaces error.

**Fix:** always deploy the **full monorepo** from the repo root with `--archive=tgz`.

## Storefront (project `jerzyfy`)

Production alias: **https://jerzyfy.vercel.app**

```powershell
cd a:\jerzyfy

# Env (once)
"https://45-76-61-16.sslip.io" | npx vercel env add NEXT_PUBLIC_API_URL production --cwd apps/storefront --force
"jerzyfy" | npx vercel env add NEXT_PUBLIC_DEFAULT_TENANT_SLUG production --cwd apps/storefront --force

# Deploy (from repo root — uploads whole workspace)
npx vercel --prod --archive=tgz --force --yes --local-config infra/vercel/storefront.vercel.json
```

Config: [`infra/vercel/storefront.vercel.json`](./storefront.vercel.json)  
(`outputDirectory` = `apps/storefront/.next`)

## Admin (project `jerzyfy-admin`)

Production alias: **https://jerzyfy-admin.vercel.app**

```powershell
cd a:\jerzyfy

# Link root .vercel to the admin project (storefront uses project `jerzyfy` — switch back after)
npx vercel link --yes --project jerzyfy-admin --scope frndswork-7090s-projects

"https://45-76-61-16.sslip.io" | npx vercel env add NEXT_PUBLIC_API_URL production --force
"jerzyfy" | npx vercel env add NEXT_PUBLIC_DEFAULT_TENANT_SLUG production --force
"admin" | npx vercel env add NEXT_PUBLIC_PORTAL production --force

npx vercel --prod --archive=tgz --force --yes --local-config infra/vercel/admin.vercel.json

# Switch link back to storefront project
npx vercel link --yes --project jerzyfy --scope frndswork-7090s-projects
```

Config: [`infra/vercel/admin.vercel.json`](./admin.vercel.json)  
Build script: [`build-admin.mjs`](./build-admin.mjs).

## CORS

After both URLs exist:

```powershell
.\infra\docker\deploy.ps1 `
  -PublicIp 45.76.61.16 `
  -ApiHost 45-76-61-16.sslip.io `
  -AcmeEmail frndswork@gmail.com `
  -StorefrontOrigin https://jerzyfy.vercel.app `
  -AdminOrigin https://jerzyfy-admin.vercel.app `
  -UpdateCorsOnly
```

(API VM must be on the slim hybrid stack first.)

## Dashboard override

If builds still run `cd ../.. && npm install`, clear **Install Command** in the Vercel project settings (set to empty / default). Project overrides beat `vercel.json`.
