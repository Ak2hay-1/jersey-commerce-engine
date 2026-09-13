# Cohost Jerzyfy API on the Cullinos VM (shared nginx :80/:443)

**Target host:** `95.135.254.46` (Cullinos production)  
**Old API host:** `45.76.61.16` (`https://45-76-61-16.sslip.io`) — keep as rollback until Vercel is switched  
**New API URL (live):** `https://95-135-254-46.sslip.io`  
**Preferred DNS (next):** `api.jerzyfy.in` A → `95.135.254.46`, then certbot + Vercel URL update  
**Tenant:** `jerzyfy`  
**Frontends (unchanged hosts):** `https://www.jerzyfy.in`, `https://admin.jerzyfy.in` (Vercel)

Cullinos keeps nginx on **80/443**. Jerzyfy runs Docker **postgres + redis + api** only, published as **`127.0.0.1:4000`**. No Jerzyfy Caddy.

```
Internet → nginx :443
             ├─ *.cullinos.com     → existing
             └─ api.jerzyfy.in     → 127.0.0.1:4000
```

---

## Files

| File | Role |
| --- | --- |
| `docker-compose.cohost.yml` | Override: loopback `:4000`, disable Caddy |
| `prod-up-cohost.sh` | Build/start cohost stack |
| `nginx-jerzyfy-api.conf` | Reference HTTPS nginx site |
| `cohost-export.sh` | Old VM: dump DB + uploads |
| `cohost-import.sh` | New VM: restore + start |
| `cohost-install-nginx.sh` | New VM: nginx site + certbot |
| `run-cohost-cutover.ps1` | Windows orchestrator (recommended) |
| `run-cohost-deploy.ps1` | Later API-only updates on cohost VM |

---

## Preconditions

1. DNS: `api.jerzyfy.in` **A** → `95.135.254.46` (before certbot).
2. SSH passwords:
   - Old: `infra/docker/.vultr-ssh-password` or `$env:VULTR_SSH_PASSWORD`
   - New: `infra/docker/.cohost-ssh-password` or `$env:COHOST_SSH_PASSWORD`
3. New VM has Docker + nginx + certbot (Cullinos already does).
4. Free RAM/disk for a second Postgres/Redis/API (~1GB+).

---

## One-shot cutover (from Windows)

```powershell
cd a:\jerzyfy
# Optional: copy cohost password
# Set-Content infra\docker\.cohost-ssh-password "NEW_VM_ROOT_PASSWORD"

.\infra\docker\run-cohost-cutover.ps1
```

This will:

1. Upload cohost scripts to both VMs  
2. Freeze + export on `45.76.61.16`  
3. SFTP dump/uploads/env via your PC  
4. Restore + `prod-up-cohost.sh` on `95.135.254.46`  
5. Install nginx site + Let's Encrypt for `api.jerzyfy.in`

Skip steps if needed:

```powershell
.\infra\docker\run-cohost-cutover.ps1 -SkipNginx   # stack only
.\infra\docker\run-cohost-cutover.ps1 -SkipExport  # bundle already on new VM
```

---

## Manual steps (same order)

### 1. Export (old VM)

```bash
cd /opt/jersey
bash infra/docker/cohost-export.sh /root/jerzyfy-migrate
```

### 2. Copy bundle to new VM

```bash
scp -r root@45.76.61.16:/root/jerzyfy-migrate root@95.135.254.46:/root/
```

### 3. Import (new VM)

```bash
cd /opt/jersey   # git clone if missing
PUBLIC_IP=95.135.254.46 \
API_HOST=api.jerzyfy.in \
CORS_ORIGINS=https://www.jerzyfy.in,https://admin.jerzyfy.in \
  bash infra/docker/cohost-import.sh /root/jerzyfy-migrate
```

### 4. nginx + cert

```bash
bash infra/docker/cohost-install-nginx.sh
```

### 5. Vercel

Set on **both** storefront and admin projects:

`NEXT_PUBLIC_API_URL=https://api.jerzyfy.in`

Redeploy both.

### 6. Smoke

```powershell
Invoke-RestMethod https://api.jerzyfy.in/health
Invoke-RestMethod https://api.jerzyfy.in/ready
```

- Storefront catalog + images  
- Staff login + `/pos/` sale + ERP live update  
- Cullinos domains still OK  

### 7. Decommission old API

Keep `45.76.61.16` idle 3–7 days, then stop its stack.

---

## Ongoing deploys (cohost)

```powershell
.\infra\docker\run-cohost-deploy.ps1
```

Or on the VM:

```bash
cd /opt/jersey && git pull && bash infra/docker/prod-up-cohost.sh
```

Never run `prod-up.sh` (Caddy) on this host — it will fight Cullinos for 80/443.

Never `prisma:seed` in production.

---

## Rollback

1. Vercel: `NEXT_PUBLIC_API_URL=https://45-76-61-16.sslip.io` → redeploy  
2. Start old stack on `45.76.61.16` (`prod-up.sh`)  
3. Disable Jerzyfy nginx site on new VM if needed  

Data written only on the new DB after cutover will not exist on the old VM.

---

## Hard rules

| Do | Don’t |
| --- | --- |
| Bind API to `127.0.0.1:4000` | Publish `0.0.0.0:4000` or start Caddy on 80/443 |
| Explicit `server_name api.jerzyfy.in` | Steal Cullinos `default_server` |
| Separate Docker volumes/network | Share Cullinos Postgres/Redis |
| Keep `SECRETS_ENCRYPTION_KEY` from old env | Rotate encryption key on restore |
