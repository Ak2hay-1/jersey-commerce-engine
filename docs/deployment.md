# Production on a Vultr Ubuntu VM (IP access, no domain)

Drive the Ubuntu VM from **Windows PowerShell**. The VM only needs git + Docker.

Public repo: https://github.com/Ak2hay-1/jersey-commerce-engine.git

| App | URL |
| --- | --- |
| Storefront | `http://YOUR_IP/` |
| Admin | `http://YOUR_IP:3001/` |
| POS | `http://YOUR_IP:3002/` |
| API | `http://YOUR_IP:4000/` |
| Health | `http://YOUR_IP:4000/health` |
| API docs | `http://YOUR_IP:4000/docs` |

Postgres and Redis stay private on the Docker network.

`NEXT_PUBLIC_*` values are baked into Next.js images at **build** time. If `PUBLIC_IP` changes, rebuild.

## From Windows PowerShell

Replace `YOUR_IP` and the SSH user (`root` on many Vultr images, sometimes `ubuntu` or `linuxuser`).

```powershell
cd a:\jerzyfy
.\infra\docker\deploy.ps1 -PublicIp YOUR_IP -SshUser root
```

If you log in with a key:

```powershell
.\infra\docker\deploy.ps1 -PublicIp YOUR_IP -SshUser root -SshKey $env:USERPROFILE\.ssh\id_ed25519
```

The script will:

1. SSH to the VM
2. `git clone` (or `git pull`) the public GitHub repo into `/opt/jersey`
3. Install Docker, add 4 GB swap, open ports 22 / 80 / 3001 / 3002 / 4000
4. Create `.env.production` with random secrets the first time (printed once)
5. Build and start the stack (15–30 minutes on 4 GB)

Also allow those ports in the **Vultr** firewall if you use one.

## Create the first shop

Do **not** run `prisma:seed` in production. After `http://YOUR_IP:4000/health` returns 200, in PowerShell:

```powershell
$ip = "YOUR_IP"
$bootstrap = "BOOTSTRAP_SECRET_PRINTED_BY_DEPLOY"
$body = @{
  name          = "My Jersey Store"
  slug          = "demo-jersey-store"
  ownerEmail    = "owner@example.com"
  ownerPassword = "ChangeMe1!"
  ownerName     = "Store Owner"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri "http://${ip}:4000/api/v1/admin/tenants" `
  -Headers @{ "X-Bootstrap-Secret" = $bootstrap } `
  -ContentType "application/json" `
  -Body $body
```

Password must include uppercase, lowercase, a number, and a special character.

Log in at `http://YOUR_IP:3001/` with that owner email and password.

## Manual SSH (same steps)

```powershell
ssh root@YOUR_IP
```

On the VM:

```bash
apt-get update && apt-get install -y git
git clone https://github.com/Ak2hay-1/jersey-commerce-engine.git /opt/jersey
bash /opt/jersey/infra/docker/vm-setup.sh
cp /opt/jersey/infra/docker/.env.production.example /opt/jersey/infra/docker/.env.production
nano /opt/jersey/infra/docker/.env.production
bash /opt/jersey/infra/docker/prod-up.sh
```

## Later updates from PowerShell

```powershell
.\infra\docker\deploy.ps1 -PublicIp YOUR_IP -SshUser root -SkipSetup
```

When you later attach a domain, switch to HTTPS, set `COOKIE_SECURE=true`, and rebuild with `https://` API URLs.
