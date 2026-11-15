#!/usr/bin/env bash
# One-shot fresh cohost bootstrap on a shared nginx VM (empty DB, no import).
# Usage (as root on the VM):
#   bash infra/docker/fresh-cohost-bootstrap.sh
# Optional env overrides: PUBLIC_IP API_HOST ACME_EMAIL CORS_ORIGINS TENANT_SLUG OWNER_EMAIL OWNER_PASSWORD
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

PUBLIC_IP="${PUBLIC_IP:-95.135.254.73}"
API_HOST="${API_HOST:-api.jerzyfy.in}"
ACME_EMAIL="${ACME_EMAIL:-rkyves.com@gmail.com}"
CORS_ORIGINS="${CORS_ORIGINS:-https://www.jerzyfy.in,https://admin.jerzyfy.in}"
TENANT_SLUG="${TENANT_SLUG:-jerzyfy}"
OWNER_EMAIL="${OWNER_EMAIL:-rkyves.com@gmail.com}"
OWNER_NAME="${OWNER_NAME:-Jerzyfy Owner}"
OWNER_PASSWORD="${OWNER_PASSWORD:-}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root."
  exit 1
fi

rand_secret() {
  openssl rand -base64 48 | tr -d '\n' | tr '+/' 'Aa' | head -c 48
}

rand_alnum() {
  # Postgres password must stay URL-safe for DATABASE_URL
  openssl rand -base64 36 | tr -d '\n/+=' | head -c 32
}

echo "==> Preflight"
command -v nginx >/dev/null || { echo "nginx missing — install nginx before Jerzyfy cohost"; exit 1; }
if ! command -v git >/dev/null; then
  apt-get update -y
  apt-get install -y git
fi
if ! command -v docker >/dev/null; then
  echo "==> Installing Docker (vm-setup.sh)"
  bash infra/docker/vm-setup.sh
fi
if ! command -v certbot >/dev/null; then
  apt-get update -y
  apt-get install -y certbot python3-certbot-nginx
fi
if ! command -v curl >/dev/null; then
  apt-get update -y
  apt-get install -y curl
fi
if ! command -v openssl >/dev/null; then
  apt-get update -y
  apt-get install -y openssl
fi

if ss -lntp 2>/dev/null | grep -q ':4100'; then
  echo "WARN: something already listens on :4100"
fi

ENV_FILE=infra/docker/.env.production
SECRETS_FILE=/root/jerzyfy-bootstrap-secrets.txt

if [[ ! -f "$ENV_FILE" ]]; then
  echo "==> Writing $ENV_FILE (secrets also saved to $SECRETS_FILE)"
  POSTGRES_PASSWORD="$(rand_alnum)"
  JWT_ACCESS_SECRET="$(rand_secret)"
  JWT_REFRESH_SECRET="$(rand_secret)"
  BOOTSTRAP_SECRET="$(rand_secret)"
  SECRETS_ENCRYPTION_KEY="$(rand_secret)"
  BACKUP_ENCRYPTION_KEY="$(rand_secret)"
  STOREFRONT_PROXY_SECRET="$(rand_secret)"

  cat >"$ENV_FILE" <<EOF
PUBLIC_IP=${PUBLIC_IP}
API_HOST=${API_HOST}
ACME_EMAIL=${ACME_EMAIL}
CORS_ORIGINS=${CORS_ORIGINS}
COOKIE_SECURE=true
COOKIE_SAMESITE=none
POSTGRES_USER=jersey
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=jersey_commerce
NEXT_PUBLIC_DEFAULT_TENANT_SLUG=${TENANT_SLUG}
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
BOOTSTRAP_SECRET=${BOOTSTRAP_SECRET}
SECRETS_ENCRYPTION_KEY=${SECRETS_ENCRYPTION_KEY}
BACKUP_ENCRYPTION_KEY=${BACKUP_ENCRYPTION_KEY}
STOREFRONT_PROXY_SECRET=${STOREFRONT_PROXY_SECRET}
ORDER_PAYMENT_TTL_MINUTES=60
LOG_LEVEL=info
R2_BACKUP_BUCKET=jerzyfy-backups
EOF
  chmod 600 "$ENV_FILE"

  umask 077
  cat >"$SECRETS_FILE" <<EOF
# Generated $(date -u +%Y-%m-%dT%H:%M:%SZ) — store offline, then shred this file
PUBLIC_IP=${PUBLIC_IP}
API_HOST=${API_HOST}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
BOOTSTRAP_SECRET=${BOOTSTRAP_SECRET}
SECRETS_ENCRYPTION_KEY=${SECRETS_ENCRYPTION_KEY}
BACKUP_ENCRYPTION_KEY=${BACKUP_ENCRYPTION_KEY}
STOREFRONT_PROXY_SECRET=${STOREFRONT_PROXY_SECRET}
EOF
  echo "Wrote secrets to $SECRETS_FILE"
else
  echo "==> Reusing existing $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

chmod +x infra/docker/prod-up-cohost.sh infra/docker/cohost-install-nginx.sh
echo "==> Starting cohost stack"
bash infra/docker/prod-up-cohost.sh

echo "==> Installing nginx + cert for ${API_HOST}"
export API_HOST ACME_EMAIL
bash infra/docker/cohost-install-nginx.sh

if [[ -z "${OWNER_PASSWORD}" ]]; then
  OWNER_PASSWORD="$(openssl rand -base64 18 | tr -d '/+=' | head -c 16)Aa1!"
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

echo "==> Bootstrapping tenant ${TENANT_SLUG} (temporarily disable SINGLE_TENANT_MODE)"
if grep -q '^SINGLE_TENANT_MODE=' "$ENV_FILE"; then
  sed -i 's|^SINGLE_TENANT_MODE=.*|SINGLE_TENANT_MODE=false|' "$ENV_FILE"
else
  echo 'SINGLE_TENANT_MODE=false' >>"$ENV_FILE"
fi
docker compose \
  -f infra/docker/docker-compose.api.yml \
  -f infra/docker/docker-compose.cohost.yml \
  --env-file "$ENV_FILE" \
  up -d --force-recreate api

BODY=$(cat <<EOF
{"name":"Jerzyfy","slug":"${TENANT_SLUG}","ownerEmail":"${OWNER_EMAIL}","ownerPassword":"${OWNER_PASSWORD}","ownerName":"${OWNER_NAME}"}
EOF
)

for i in $(seq 1 36); do
  if curl -fsS "http://127.0.0.1:4100/health" >/dev/null 2>&1; then
    break
  fi
  sleep 5
done

HTTP=$(curl -sS -o /tmp/jerzyfy-bootstrap.json -w '%{http_code}' \
  -X POST "http://127.0.0.1:4100/api/v1/admin/tenants" \
  -H "Content-Type: application/json" \
  -H "X-Bootstrap-Secret: ${BOOTSTRAP_SECRET}" \
  -d "$BODY" || true)

echo "Bootstrap HTTP ${HTTP}"
cat /tmp/jerzyfy-bootstrap.json || true
echo

if [[ "$HTTP" == "201" || "$HTTP" == "200" ]]; then
  echo "==> Re-enable SINGLE_TENANT_MODE and clear BOOTSTRAP_SECRET"
  sed -i 's|^SINGLE_TENANT_MODE=.*|SINGLE_TENANT_MODE=true|' "$ENV_FILE"
  sed -i 's|^BOOTSTRAP_SECRET=.*|BOOTSTRAP_SECRET=|' "$ENV_FILE"
  docker compose \
    -f infra/docker/docker-compose.api.yml \
    -f infra/docker/docker-compose.cohost.yml \
    --env-file infra/docker/.env.production \
    up -d --force-recreate api
  echo "OWNER_EMAIL=${OWNER_EMAIL}" >>"$SECRETS_FILE"
  echo "OWNER_PASSWORD=${OWNER_PASSWORD}" >>"$SECRETS_FILE"
  echo "Tenant ready. Owner login: ${OWNER_EMAIL} / (see ${SECRETS_FILE})"
elif [[ "$HTTP" == "409" ]]; then
  echo "Tenant already exists — restoring SINGLE_TENANT_MODE=true"
  sed -i 's|^SINGLE_TENANT_MODE=.*|SINGLE_TENANT_MODE=true|' "$ENV_FILE"
  docker compose \
    -f infra/docker/docker-compose.api.yml \
    -f infra/docker/docker-compose.cohost.yml \
    --env-file infra/docker/.env.production \
    up -d --force-recreate api
else
  echo "Bootstrap failed — fix and retry. BOOTSTRAP_SECRET left in place."
  exit 1
fi

echo "==> Done"
curl -fsS "https://${API_HOST}/health" && echo
curl -fsS "https://${API_HOST}/ready" && echo
echo "Set Vercel storefront STOREFRONT_PROXY_SECRET to match VM (.env.production) then redeploy."
