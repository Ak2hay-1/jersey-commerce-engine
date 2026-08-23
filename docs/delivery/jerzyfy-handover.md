# Jerzyfy production handover

## Live URLs

| App | URL |
| --- | --- |
| Storefront | https://www.jerzyfy.in |
| Admin (CMS + users) | https://admin.jerzyfy.in |
| API | https://45-76-61-16.sslip.io |
| Staff EXE | `Jerzyfy-Staff-Setup-Jerzyfy.exe` (POS + ERP) |

## Staff accounts

Create all staff in **Admin → Users** with temporary passwords. Each user must change password on first login. Do not use demo scripts or `DevPassword123!` in production.

| Role | Access |
| --- | --- |
| SUPER_ADMIN / OWNER | Full shop control |
| MANAGER | Ops without settings.manage |
| CASHIER | POS + sales only |
| INVENTORY_MANAGER | Stock + purchasing |
| WEBSITE_MANAGER | CMS + promo codes |

## Logo

Logo and favicon are set in production `website_settings`. To change later: **Admin → Website → Branding** → upload → Save.

Current production logo URL is served from the API media path (`/api/v1/media/...`).

## Staff EXE

Installer: `apps/desktop/dist/Jerzyfy-Staff-Setup-Jerzyfy.exe` (~136 MB)

Pack again after API URL changes:

```powershell
.\infra\desktop\pack-client.ps1 -ApiUrl "https://45-76-61-16.sslip.io" -ClientName "Jerzyfy"
```

## Known limitations (not bugs)

- Online card capture (Razorpay) is not wired — use COD / pay-in-store
- Customer password-reset email is not live — owner sets temp password in Admin
- Receipt printers are HTML only — no ESC/POS drivers

See [known-limitations.md](./known-limitations.md).

## Go-live checklist (remaining manual steps)

- [ ] **Staff accounts**: Owner logs into [admin.jerzyfy.in](https://admin.jerzyfy.in) → **Users** → create manager, cashier, inventory, and website manager with temporary passwords (forced change on first login).
- [ ] **UAT sign-off**: Print and sign [uat-signoff.md](./uat-signoff.md) after first POS sale and web order.
- [ ] **Backup**: In Admin → Settings → Backup, set path under `BACKUP_ALLOWED_ROOT` and confirm one backup file exists.
- [ ] **Bootstrap secret**: Clear or rotate `BOOTSTRAP_SECRET` in VM `.env.production` after all tenants are created (empty secret → bootstrap route 404s).
- [ ] **Install EXE** on staff PCs from `apps/desktop/dist/Jerzyfy-Staff-Setup-Jerzyfy.exe`.

## Operations

- API updates: `.\infra\docker\run-production-deploy.ps1`
- CORS refresh after domain change: `deploy.ps1 -UpdateCorsOnly`
- Never run `prisma:seed` on the VM
- Backup restore drill: weekly at first

## Emergency

- API health: `https://45-76-61-16.sslip.io/health`
- VM: Vultr `45.76.61.16`
