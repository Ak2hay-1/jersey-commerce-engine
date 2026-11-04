# Jerzyfy production handover

Filled instance of [CLIENT-HANDOVER-TEMPLATE.md](./CLIENT-HANDOVER-TEMPLATE.md).  
Every update after launch: [RELEASE-OPS-PLAYBOOK.md](./RELEASE-OPS-PLAYBOOK.md).  
Company context: [../rkyves/BUSINESS-CONTEXT.md](../rkyves/BUSINESS-CONTEXT.md).

## Live URLs


| App | URL |
| --- | --- |
| Storefront | [https://www.jerzyfy.in](https://www.jerzyfy.in) |
| Staff portal (Admin + ERP + POS) | [https://admin.jerzyfy.in](https://admin.jerzyfy.in) — POS at [/pos/](https://admin.jerzyfy.in/pos/) |
| API (live, cohost) | [https://api.jerzyfy.in](https://api.jerzyfy.in) on shared VM `103.216.169.172` (host nginx → `127.0.0.1:4100`) — see [../../infra/docker/COHOST-CUTOVER.md](../../infra/docker/COHOST-CUTOVER.md). Cloudflare origin A → `103.216.169.172`; Vercel `NEXT_PUBLIC_API_URL=https://api.jerzyfy.in`. |
| API (previous host, offline) | Was `95.135.254.46` / earlier Vultr `45.76.61.16` — not used for rollback after the empty rebuild on 2026-11-04. |


## Staff accounts

Create all staff in **Staff portal → Users** with temporary passwords. Each user must change password on first login. Do not use demo scripts or `DevPassword123!` in production.


| Role | Access |
| --- | --- |
| SUPER_ADMIN / OWNER | Full shop control |
| MANAGER | Ops without settings.manage |
| CASHIER | POS + sales only |
| INVENTORY_MANAGER | Stock + purchasing |
| WEBSITE_MANAGER | CMS + promo codes |



## Logo

Logo and favicon are set in production `website_settings`. To change later: **Storefront → Customize** → Branding → upload → Save.

Current production logo URL is served from the API media path (`/api/v1/media/...`).



## Known limitations (not bugs)

- Online card capture (Razorpay) is wired for Standard Checkout — configure keys in Admin → Settings → Payments or `RAZORPAY_*` env vars
- Customer password-reset email is not live — owner sets temp password in Staff portal
- Receipt printers are HTML only — no ESC/POS drivers

See [known-limitations.md](./known-limitations.md).

## Go-live checklist (remaining manual steps)

- [ ] **Staff portal redeploy** with unified build (`portal=all` + POS at `/pos`): confirm [admin.jerzyfy.in](https://admin.jerzyfy.in) shows ERP + Website, and [/pos/](https://admin.jerzyfy.in/pos/) loads the register.
- [x] **API health**: `https://api.jerzyfy.in/health` OK on `103.216.169.172`.
- [x] **CORS**: `CORS_ORIGINS` includes `https://www.jerzyfy.in` and `https://admin.jerzyfy.in`.
- [ ] **Staff accounts**: Owner logs into [admin.jerzyfy.in](https://admin.jerzyfy.in) → change forced password → **Users** → create manager, cashier, inventory, and website manager with temporary passwords.
- [ ] **Catalog / media**: Fresh empty DB after 2026-11-04 cutover — re-upload products and images in Admin.
- [ ] **Payments**: Re-enter Razorpay keys in Admin → Settings → Payments; webhook `https://api.jerzyfy.in/api/v1/webhooks/razorpay`.
- [ ] **Vercel**: Confirm `NEXT_PUBLIC_API_URL=https://api.jerzyfy.in` and `NEXT_PUBLIC_DEFAULT_TENANT_SLUG=jerzyfy`; set `STOREFRONT_PROXY_SECRET` to match VM `.env.production` then redeploy storefront.
- [ ] **UAT sign-off**: Print and sign [uat-signoff.md](./uat-signoff.md) after first POS sale and web order.
- [ ] **Backup (local + R2)**:
  1. Cloudflare → R2 → create private bucket `jerzyfy-backups`; create API token (Object Read & Write on that bucket).
  2. Set `BACKUP_ENCRYPTION_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BACKUP_BUCKET=jerzyfy-backups` on the API host `.env.production`; restart API.
  3. Admin → Settings → Backup: enable, path `/backups`, interval **1 Days**, retain 14, quiet IST hour → **Run backup now**.
  4. Confirm SUCCESS in Recent backups, a file under the `api_backups` volume, and an object at `backups/<tenant-slug>/` in R2.
- [x] **Bootstrap secret**: Cleared on the live VM after the first tenant (`jerzyfy`).



## Operations

- **Live API** cohosts on `103.216.169.172` (nginx → `127.0.0.1:4100`; host `:4000` is used by another app). Playbook: [../../infra/docker/COHOST-CUTOVER.md](../../infra/docker/COHOST-CUTOVER.md)
- API updates: `.\infra\docker\run-cohost-deploy.ps1`
- Do **not** run `prod-up.sh` / Caddy on the shared VM (ports 80/443 belong to host nginx)
- Staff portal / storefront updates: redeploy Vercel with `NEXT_PUBLIC_API_URL=https://api.jerzyfy.in`
- Never run `prisma:seed` on the VM
- Backup restore drill: weekly at first
- Jersey Staff EXE is **deprecated** — do not pack or install for Jerzyfy



## Emergency

- API health: `https://api.jerzyfy.in/health`
- API ready: `https://api.jerzyfy.in/ready`
- VM: `103.216.169.172` (shared with Cullinos + other apps)