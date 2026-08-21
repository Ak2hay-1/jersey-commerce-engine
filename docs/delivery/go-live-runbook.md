# Go-live runbook

Do these steps **in order** on launch day. Do not seed production. Full deploy mechanics: [../deployment.md](../deployment.md).

Replace `YOUR_IP`, `YOUR_SSH_USER`, and printed secrets. Run from Windows PowerShell in the repo root.

---

## 0. Stop if not ready

- [ ] [Developer checklist](./developer-checklist.md) release gate is green on `main`.
- [ ] Catalog and opening stock are agreed, not “we will fix tomorrow.”
- [ ] Client available for [UAT](./uat-signoff.md).
- [ ] Maintenance window agreed.

---

## 1. DNS + deploy the API VM

Point `API_HOST` (e.g. `api.yourshop.com`) A record at `YOUR_IP` first.

```powershell
.\infra\docker\deploy.ps1 `
  -PublicIp YOUR_IP `
  -ApiHost api.yourshop.com `
  -AcmeEmail you@example.com `
  -StorefrontOrigin https://YOUR_SHOP.vercel.app `
  -AdminOrigin https://YOUR_ADMIN.vercel.app `
  -SshUser root
```

The script clones or pulls the public repo, installs Docker if needed, writes `.env.production` (secrets printed **once**), and starts **postgres + redis + api + Caddy**.

- [ ] Vultr/UFW allows 22, 80, 443.
- [ ] DNS for `API_HOST` resolves to this IP.
- [ ] Copy bootstrap secret and DB password to a password manager. Delete the terminal scrollback later.

Later API updates:

```powershell
.\infra\docker\deploy.ps1 ... -SkipSetup
```

---

## 2. Prove the API is up + deploy Vercel

```powershell
$api = "https://API_HOST"
Invoke-RestMethod "$api/health"
Invoke-RestMethod "$api/ready"
```

- [ ] Both return success.
- [ ] `$api/docs` is **not** a public Swagger UI.

Deploy Storefront and Admin on Vercel ([../../infra/vercel/README.md](../../infra/vercel/README.md)) with `NEXT_PUBLIC_API_URL=https://API_HOST`. Then refresh CORS if the production origins differ from the placeholders used in step 1:

```powershell
.\infra\docker\deploy.ps1 ... -UpdateCorsOnly
```

- [ ] Storefront loads on Vercel.
- [ ] Admin login loads on Vercel.

Postgres and Redis stay on the Docker network. Do not publish them.

---

## 3. Create the shop (never seed)

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

Password must include uppercase, lowercase, a number, and a special character. The owner is created with a **temporary** password and must change it on first Admin sign-in before they can create other staff.

- [ ] Owner can log in on the **Vercel Admin** URL and is forced to set a new password.
- [ ] Shop picker on the login page shows this tenant by name (no typed slug).
- [ ] Provisioned owner has SUPER_ADMIN so they can create the client’s superior-admin user.
- [ ] Do **not** run `npm run prisma:seed` on this VM.

Optional: clear or rotate `BOOTSTRAP_SECRET` after the first tenant so the route 404s.

Replace the emails below on launch day. Create the five non-owner accounts in Admin → Users after the owner has changed their password. Use the same temporary password for each; they cannot use Admin, ERP, or POS until they change it.

| Role | Email (replace) | Temporary password | Created by |
| --- | --- | --- | --- |
| Owner + Superior Admin | `owner@client.example` | `ChangeMe1!` | Bootstrap above |
| Superior Admin (client) | `superadmin@client.example` | `ChangeMe1!` | Admin → Users |
| Manager | `manager@client.example` | `ChangeMe1!` | Admin → Users |
| Cashier | `cashier@client.example` | `ChangeMe1!` | Admin → Users |
| Inventory Manager | `inventory@client.example` | `ChangeMe1!` | Admin → Users |
| Website Manager | `website@client.example` | `ChangeMe1!` | Admin → Users |

Do not use `*@demo.local` or `DevPassword123!` in production.

---

## 4. Staff PCs (ERP and POS)

```powershell
.\infra\desktop\pack-client.ps1 -ApiUrl "https://API_HOST" -ClientName "ClientShop"
```

On each staff machine:

1. Install `Jersey-Staff-Setup-*.exe` from `apps/desktop/dist/`.
2. Open **Jersey Staff**.
3. Log in with a user created in Vercel Admin.
4. Use the **POS | ERP** switch in the top menu to change mode (same login).

CORS on the VM must include `http://127.0.0.1:39217` (set by `deploy.ps1`).

- [ ] Staff EXE installs and opens.
- [ ] Login succeeds against `https://API_HOST`.
- [ ] POS | ERP switch works without a second login.
- [ ] Admin remains on Vercel; storefront remains on Vercel.

---

## 5. Load real data

Order matters. Stock last, after catalog exists.

- [ ] Website settings: name, logo, colors, footer, contact, policies.
- [ ] Categories and products (SKU unique per tenant).
- [ ] Opening inventory = physical count. Movements store cost at that time.
- [ ] Document sequences start at the agreed invoice/receipt number.
- [ ] Users: owner, manager, cashier, inventory, website manager — least privilege. Each live account used the temporary password once and set their own.
- [ ] Demo promo codes removed; live codes only.

---

## 6. Backup before first customer

- [ ] Confirm backup scheduler/config for this tenant (`BACKUP_ALLOWED_ROOT` on the API).
- [ ] Trigger or wait for a backup; confirm a file exists on disk.
- [ ] If you have never restored this stack, restore into a throwaway database **now**, not after a failure.

---

## 7. Live smoke (real receipts)

- [ ] POS: one real (or agreed test) sale, receipt viewed, stock down.
- [ ] Storefront: one order, appears in ERP.
- [ ] Refund one of them; stock and money reverse.
- [ ] Dashboard and a sales report match the calculator in [uat-signoff.md](./uat-signoff.md).
- [ ] Realtime: ERP updates without a full page reload.

---

## 8. Close the loop

- [ ] [UAT sign-off](./uat-signoff.md) signed.
- [ ] Owner password changed from the bootstrap value (enforced on first login).
- [ ] Bootstrap secret and DB password not left in WhatsApp/email.
- [ ] Client has the URLs, who uses which app, and your outage contact.
- [ ] [Known limitations](./known-limitations.md) re-stated (gateways, email reset, printers).

---

## 9. If something is wrong

| Symptom | First check |
| --- | --- |
| Storefront empty / API errors | `https://API_HOST/ready`, CORS includes the Vercel origin, `NEXT_PUBLIC_API_URL` on Vercel |
| Admin cannot login | API health, CORS origins, clock skew, rate limit |
| EXE cannot login | Pack URL is `https://API_HOST`, CORS includes `http://127.0.0.1:39217` |
| ERP stale after POS sale | WebSocket `wss://API_HOST/realtime?token=...`, Redis up |
| Wrong shop branding | Tenant website settings, not a code redeploy |
| Seed users exist | Recreate tenant; never “fix” by seeding |
| Caddy / TLS fails | DNS A record for `API_HOST`, ports 80/443, `docker logs jce-caddy` |

Rollback: previous git revision + `deploy.ps1 -SkipSetup`. Do not `migrate` forward and hope. If a migration already applied, you need a forward fix, not a silent down-migration on live finance data.
