# Production on a Vultr Ubuntu VM (IP access, no domain)

Without a domain the apps are reached by **IP and port** over HTTP.

| App | URL |
| --- | --- |
| Storefront | `http://YOUR_IP/` |
| Admin | `http://YOUR_IP:3001/` |
| POS | `http://YOUR_IP:3002/` |
| API | `http://YOUR_IP:4000/` |
| API health | `http://YOUR_IP:4000/health` |
| API docs | `http://YOUR_IP:4000/docs` |

Postgres and Redis stay on the Docker network and are not published.

`NEXT_PUBLIC_*` values are baked into the Next.js images at **build** time. If you change `PUBLIC_IP`, rebuild the frontend images.

## 1. Prepare the VM

SSH in as root (or use sudo):

```bash
# after the repo is on the server
sudo bash infra/docker/vm-setup.sh
```

That installs Docker, adds 4 GB swap, and opens ports 22, 80, 3001, 3002, and 4000.

Copy the project to `/opt/jersey` with `git clone` or `scp -r`.

## 2. Production env

```bash
cd /opt/jersey
cp infra/docker/.env.production.example infra/docker/.env.production
nano infra/docker/.env.production
```

Set `PUBLIC_IP` to the Vultr IPv4 address (no `http://`). Replace every `replace-with-…` secret. Use a Postgres password with letters and numbers only.

## 3. Build and start

On 4 GB RAM, build one service at a time:

```bash
cd /opt/jersey
export COMPOSE_PARALLEL_LIMIT=1
npm run prod:up
```

First build can take 15–30 minutes. Watch:

```bash
npm run prod:logs
```

When API health returns 200:

```bash
curl http://127.0.0.1:4000/health
curl http://127.0.0.1:4000/ready
```

## 4. Create the first shop

Do **not** run `prisma:seed` in production. Create a tenant and owner:

```bash
curl -X POST "http://YOUR_IP:4000/api/v1/admin/tenants" \
  -H "Content-Type: application/json" \
  -H "X-Bootstrap-Secret: THE_BOOTSTRAP_SECRET_FROM_ENV" \
  -d '{
    "name": "My Jersey Store",
    "slug": "demo-jersey-store",
    "ownerEmail": "owner@example.com",
    "ownerPassword": "ChangeMe1!",
    "ownerName": "Store Owner"
  }'
```

Password must include uppercase, lowercase, a number, and a special character.

Log in at `http://YOUR_IP:3001/` with that owner email and password. Open the shop at `http://YOUR_IP/` (default slug is `NEXT_PUBLIC_DEFAULT_TENANT_SLUG`).

## 5. Useful commands

```bash
npm run prod:logs
npm run prod:down
docker compose -f infra/docker/docker-compose.prod.yml --env-file infra/docker/.env.production ps
```

Rebuild after an IP or env change:

```bash
npm run prod:up -- --build
```

When you later attach a domain, switch to HTTPS, set `COOKIE_SECURE=true`, and rebuild with `https://` API URLs.
