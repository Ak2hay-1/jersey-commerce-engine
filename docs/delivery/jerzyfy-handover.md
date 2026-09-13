# Jerzyfy production handover

Filled instance of [CLIENT-HANDOVER-TEMPLATE.md](./CLIENT-HANDOVER-TEMPLATE.md).  
Every update after launch: [RELEASE-OPS-PLAYBOOK.md](./RELEASE-OPS-PLAYBOOK.md).  
Company context: [../rkyves/BUSINESS-CONTEXT.md](../rkyves/BUSINESS-CONTEXT.md).

## Live URLs


| App | URL |
| --- | --- |
| Storefront | [https://www.jerzyfy.in](https://www.jerzyfy.in) |
| Staff portal (Admin + ERP + POS) | [https://admin.jerzyfy.in](https://admin.jerzyfy.in) — POS at [/pos/](https://admin.jerzyfy.in/pos/) |
| API (live, cohost) | [https://95-135-254-46.sslip.io](https://95-135-254-46.sslip.io) on shared VM `95.135.254.46` (Cullinos nginx) — see [../../infra/docker/COHOST-CUTOVER.md](../../infra/docker/COHOST-CUTOVER.md) |
| API (preferred DNS) | `api.jerzyfy.in` → point A at `95.135.254.46`, then reissue cert + update Vercel |
| API (legacy rollback) | [https://45-76-61-16.sslip.io](https://45-76-61-16.sslip.io) on `45.76.61.16` |


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

- Online card capture (Razorpay) is not wired — use COD / pay-in-store
- Customer password-reset email is not live — owner sets temp password in Staff portal
- Receipt printers are HTML only — no ESC/POS drivers

See [known-limitations.md](./known-limitations.md).

## Go-live checklist (remaining manual steps)

- [ ] **Staff portal redeploy** with unified build (`portal=all` + POS at `/pos`): confirm [admin.jerzyfy.in](https://admin.jerzyfy.in) shows ERP + Website, and [/pos/](https://admin.jerzyfy.in/pos/) loads the register.
- [x] **API health**: `https://45-76-61-16.sslip.io/health` OK.
- [ ] **CORS**: `CORS_ORIGINS` includes `https://admin.jerzyfy.in` and the storefront origin (desktop `127.0.0.1:39217` no longer required).
- [ ] **Staff accounts**: Owner logs into [admin.jerzyfy.in](https://admin.jerzyfy.in) → **Users** → create manager, cashier, inventory, and website manager with temporary passwords (forced change on first login).
- [ ] **UAT sign-off**: Print and sign [uat-signoff.md](./uat-signoff.md) after first POS sale and web order.
- [ ] **Backup**: In Settings → Backup, set path under `BACKUP_ALLOWED_ROOT` and confirm one backup file exists.
- [ ] **Bootstrap secret**: Clear or rotate `BOOTSTRAP_SECRET` in VM `.env.production` after all tenants are created (empty secret → bootstrap route 404s). Requires SSH to `45.76.61.16`.



## Operations

- **Live API** cohosts with Cullinos on `95.135.254.46` (nginx → `127.0.0.1:4000`). Playbook: [../../infra/docker/COHOST-CUTOVER.md](../../infra/docker/COHOST-CUTOVER.md)
- API updates: `.\infra\docker\run-cohost-deploy.ps1`
- Do **not** run `prod-up.sh` / Caddy on the shared VM (ports 80/443 belong to Cullinos nginx)
- Staff portal / storefront updates: redeploy Vercel with `NEXT_PUBLIC_API_URL=https://95-135-254-46.sslip.io`
- Never run `prisma:seed` on the VM
- Backup restore drill: weekly at first
- Jersey Staff EXE is **deprecated** — do not pack or install for Jerzyfy



## Emergency

- API health: `https://95-135-254-46.sslip.io/health`
- API ready: `https://95-135-254-46.sslip.io/ready`
- VM: `95.135.254.46` (shared with Cullinos)
- Rollback VM: Vultr `45.76.61.16` (`https://45-76-61-16.sslip.io`) — start old stack only if reverting Vercel URL
