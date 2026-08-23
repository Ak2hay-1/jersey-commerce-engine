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

Upload shop logo and favicon in **Admin → Website → Branding**, then save. Storefront header and splash update within ~60 seconds.

## Known limitations (not bugs)

- Online card capture (Razorpay) is not wired — use COD / pay-in-store
- Customer password-reset email is not live — owner sets temp password in Admin
- Receipt printers are HTML only — no ESC/POS drivers

See [known-limitations.md](./known-limitations.md).

## Operations

- API updates: `.\infra\docker\run-production-deploy.ps1`
- CORS refresh after domain change: `deploy.ps1 -UpdateCorsOnly`
- Never run `prisma:seed` on the VM
- Backup restore drill: weekly at first

## Emergency

- API health: `https://45-76-61-16.sslip.io/health`
- VM: Vultr `45.76.61.16`
