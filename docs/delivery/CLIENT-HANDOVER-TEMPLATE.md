# Client handover template (Rkyves)

Copy this file per client (example: `docs/delivery/<client>-handover.md`). Fill every `REPLACE` field. **Do not put secret values in this file** — only where they live.

Company context: [../rkyves/BUSINESS-CONTEXT.md](../rkyves/BUSINESS-CONTEXT.md).  
Every update after launch: [RELEASE-OPS-PLAYBOOK.md](./RELEASE-OPS-PLAYBOOK.md).

---

## Identity

| Field | Value |
| --- | --- |
| Client legal / trading name | REPLACE |
| Product type | REPLACE — Digital presence only / Ops only / Full hybrid (site + admin + API + ERP/POS) |
| Industry | REPLACE |
| Go-live date | REPLACE |
| Primary contact (name, phone, email) | REPLACE |
| Rkyves owner for this account | REPLACE |
| Contract / SOW reference | REPLACE |

---

## Live URLs

| App | URL |
| --- | --- |
| Storefront / website | REPLACE |
| Admin | REPLACE or N/A |
| API | REPLACE or N/A |
| Other | REPLACE or N/A |

DNS / registrar notes: REPLACE  
Hosting notes (shared vs dedicated): REPLACE  

---

## Infrastructure

| Field | Value |
| --- | --- |
| Provider | REPLACE (e.g. Vultr) |
| Public IP | REPLACE |
| `API_HOST` | REPLACE |
| SSH user | REPLACE |
| Repo path on VM | REPLACE (e.g. `/opt/jersey`) |
| Vercel / frontend project names | REPLACE |
| Deploy script (one-command) | REPLACE (e.g. `.\infra\docker\run-production-deploy.ps1`) |

---

## Tenant & apps

| Field | Value |
| --- | --- |
| Tenant slug | REPLACE |
| Staff portal URL | REPLACE |
| Staff desktop installer | N/A (deprecated) |

### Roles in use (tick)

- [ ] SUPER_ADMIN / OWNER
- [ ] MANAGER
- [ ] CASHIER
- [ ] INVENTORY_MANAGER
- [ ] WEBSITE_MANAGER
- [ ] Other: REPLACE

---

## Secrets (locations only)

| Secret | Where stored |
| --- | --- |
| VM SSH | REPLACE (password manager entry name / `.vultr-ssh-password` path) |
| DB password | REPLACE (VM `.env.production` — never commit) |
| JWT / app secrets | REPLACE |
| Bootstrap secret | REPLACE (cleared/rotated after tenants created? Y/N) |
| Vercel / DNS accounts | REPLACE |

---

## Modules & scope

| In scope (delivered) | Out of scope / later (SOW) |
| --- | --- |
| REPLACE | REPLACE (e.g. online card capture, email password reset, ESC/POS printers) |

Known limitations doc link: REPLACE (e.g. `./known-limitations.md`)

Custom design notes (brand, fonts, imagery): REPLACE  

---

## Recurring services (partnership)

| Service | Included? | Cadence / notes |
| --- | --- | --- |
| Hosting / infra | Y/N | REPLACE |
| Backups | Y/N | Path under `BACKUP_ALLOWED_ROOT`: REPLACE |
| Monitoring | Y/N | REPLACE |
| Security updates | Y/N | REPLACE |
| Application updates | Y/N | How: [RELEASE-OPS-PLAYBOOK.md](./RELEASE-OPS-PLAYBOOK.md) |
| Support tier / response | REPLACE | REPLACE |
| Annual price revision clause | Y/N | Up to ~20% if contracted — REPLACE |

Paid extras not in retainer (examples): payment gateway, WhatsApp, SEO, catalog migration, custom modules, printers — list agreed extras: REPLACE  

---

## How we deploy updates

1. Merge fix to `main` after release gate.
2. Deploy **only changed layers** per [RELEASE-OPS-PLAYBOOK.md](./RELEASE-OPS-PLAYBOOK.md) §3.
3. Smoke per §6; changelog one-liner (date, SHA, layers).

API: REPLACE command  
Storefront: REPLACE command  
Staff portal: REPLACE command  

---

## Emergency

| Check | Value |
| --- | --- |
| API health | `https://API_HOST/health` |
| API ready | `https://API_HOST/ready` |
| Outage contact (Rkyves) | REPLACE |
| Client outage contact | REPLACE |

---

## Sign-off

| Role | Name | Date |
| --- | --- | --- |
| Rkyves | REPLACE | REPLACE |
| Client | REPLACE | REPLACE |

UAT: link or attach [uat-signoff.md](./uat-signoff.md) when used.
