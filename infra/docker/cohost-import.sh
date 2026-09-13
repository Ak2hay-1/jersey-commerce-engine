#!/usr/bin/env bash
# Run on the NEW shared VM (Cullinos host). Restores dump + uploads and starts cohost stack.
# Does NOT install nginx/certbot — run cohost-install-nginx.sh after DNS is live.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

IN_DIR="${1:-/root/jerzyfy-migrate}"
PUBLIC_IP="${PUBLIC_IP:-95.135.254.46}"
API_HOST="${API_HOST:-api.jerzyfy.in}"
CORS_ORIGINS="${CORS_ORIGINS:-https://www.jerzyfy.in,https://admin.jerzyfy.in}"

COMPOSE=(
  docker compose
  -f infra/docker/docker-compose.api.yml
  -f infra/docker/docker-compose.cohost.yml
  --env-file infra/docker/.env.production
)

if [[ ! -f "${IN_DIR}/jersey_commerce.dump" ]]; then
  echo "Missing ${IN_DIR}/jersey_commerce.dump"
  exit 1
fi
if [[ ! -f "${IN_DIR}/api_uploads.tar.gz" ]]; then
  echo "Missing ${IN_DIR}/api_uploads.tar.gz"
  exit 1
fi
if [[ ! -f "${IN_DIR}/env.production.copy" ]]; then
  echo "Missing ${IN_DIR}/env.production.copy"
  exit 1
fi

echo "==> Writing infra/docker/.env.production from export (updating host fields)"
cp "${IN_DIR}/env.production.copy" infra/docker/.env.production
chmod 600 infra/docker/.env.production

# Refresh host-specific fields; keep JWT / encryption / DB secrets from the copy.
if grep -q '^PUBLIC_IP=' infra/docker/.env.production; then
  sed -i "s|^PUBLIC_IP=.*|PUBLIC_IP=${PUBLIC_IP}|" infra/docker/.env.production
else
  echo "PUBLIC_IP=${PUBLIC_IP}" >> infra/docker/.env.production
fi
if grep -q '^API_HOST=' infra/docker/.env.production; then
  sed -i "s|^API_HOST=.*|API_HOST=${API_HOST}|" infra/docker/.env.production
else
  echo "API_HOST=${API_HOST}" >> infra/docker/.env.production
fi
if grep -q '^CORS_ORIGINS=' infra/docker/.env.production; then
  sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=${CORS_ORIGINS}|" infra/docker/.env.production
else
  echo "CORS_ORIGINS=${CORS_ORIGINS}" >> infra/docker/.env.production
fi

set -a
# shellcheck disable=SC1091
. infra/docker/.env.production
set +a

echo "==> Creating Docker volumes"
docker volume create jersey-commerce-prod_postgres_data >/dev/null
docker volume create jersey-commerce-prod_redis_data >/dev/null
docker volume create jersey-commerce-prod_api_uploads >/dev/null

echo "==> Restoring uploads into jersey-commerce-prod_api_uploads"
docker run --rm \
  -v jersey-commerce-prod_api_uploads:/data \
  -v "${IN_DIR}:/backup:ro" \
  alpine sh -c 'rm -rf /data/* /data/.[!.]* 2>/dev/null || true; tar xzf /backup/api_uploads.tar.gz -C /data'

echo "==> Starting postgres only"
export COMPOSE_PARALLEL_LIMIT=1
"${COMPOSE[@]}" up -d postgres

echo "==> Waiting for postgres"
for i in $(seq 1 60); do
  if "${COMPOSE[@]}" exec -T postgres pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "==> Restoring database (pg_restore --clean --if-exists)"
# Fresh volume may already have empty DB from POSTGRES_*; --clean replaces objects.
cat "${IN_DIR}/jersey_commerce.dump" | "${COMPOSE[@]}" exec -T postgres \
  pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists --no-owner --no-acl || {
    # pg_restore returns 1 on some benign warnings; fail only if DB is empty of tenants.
    echo "pg_restore exited non-zero — checking tenants table…"
  }

TENANT_COUNT="$("${COMPOSE[@]}" exec -T postgres \
  psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -tAc "SELECT count(*) FROM tenants;" | tr -d '[:space:]')"
if [[ -z "${TENANT_COUNT}" || "${TENANT_COUNT}" == "0" ]]; then
  echo "ERROR: tenants table empty after restore — aborting."
  exit 1
fi
echo "==> Restored OK (${TENANT_COUNT} tenant row(s))"

echo "==> Building and starting redis + api"
chmod +x infra/docker/prod-up-cohost.sh
bash infra/docker/prod-up-cohost.sh

echo "==> Import complete. Next: bash infra/docker/cohost-install-nginx.sh"
