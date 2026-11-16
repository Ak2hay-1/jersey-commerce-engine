#!/usr/bin/env bash
# Restore Jerzyfy from a full-app daily backup (.app.tar.gz.enc or .app.tar.gz).
# Rebuilds Postgres + catalogue media uploads, then starts the cohost API stack.
#
# Usage:
#   BACKUP_ENCRYPTION_KEY=... bash infra/docker/restore-app-backup.sh /path/to/jersey-slug-stamp.app.tar.gz.enc
#   bash infra/docker/restore-app-backup.sh /path/to/jersey-slug-stamp.app.tar.gz
#
# Requires: docker, docker compose, and (for .enc) Node + the API workspace for backup:decrypt.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

BACKUP_FILE="${1:-}"
PUBLIC_IP="${PUBLIC_IP:-95.135.254.46}"
API_HOST="${API_HOST:-api.jerzyfy.in}"
CORS_ORIGINS="${CORS_ORIGINS:-https://www.jerzyfy.in,https://admin.jerzyfy.in}"
WORK_DIR="${RESTORE_WORK_DIR:-/tmp/jerzyfy-app-restore-$$}"

COMPOSE=(
  docker compose
  -f infra/docker/docker-compose.api.yml
  -f infra/docker/docker-compose.cohost.yml
  --env-file infra/docker/.env.production
)

if [[ -z "${BACKUP_FILE}" ]]; then
  echo "Usage: restore-app-backup.sh <backup.app.tar.gz.enc|backup.app.tar.gz>"
  exit 1
fi
if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "Missing backup file: ${BACKUP_FILE}"
  exit 1
fi
if [[ ! -f infra/docker/.env.production ]]; then
  echo "Missing infra/docker/.env.production (needed for DB credentials and stack start)."
  exit 1
fi

set -a
# shellcheck disable=SC1091
. infra/docker/.env.production
set +a

mkdir -p "${WORK_DIR}"
cleanup() {
  rm -rf "${WORK_DIR}"
}
trap cleanup EXIT

PACKAGE="${BACKUP_FILE}"
if [[ "${BACKUP_FILE}" == *.app.tar.gz.enc ]]; then
  KEY="${BACKUP_ENCRYPTION_KEY:-}"
  if [[ -z "${KEY}" ]]; then
    echo "Set BACKUP_ENCRYPTION_KEY to decrypt ${BACKUP_FILE}"
    exit 1
  fi
  PACKAGE="${WORK_DIR}/package.app.tar.gz"
  echo "==> Decrypting full-app backup"
  BACKUP_ENCRYPTION_KEY="${KEY}" npm run backup:decrypt -w @jersey-commerce/api -- "${BACKUP_FILE}" "${PACKAGE}"
elif [[ "${BACKUP_FILE}" != *.app.tar.gz ]]; then
  echo "Expected a .app.tar.gz or .app.tar.gz.enc file"
  exit 1
fi

echo "==> Extracting package contents"
tar xzf "${PACKAGE}" -C "${WORK_DIR}"
if [[ ! -f "${WORK_DIR}/database.dump" || ! -f "${WORK_DIR}/uploads.tar.gz" ]]; then
  echo "ERROR: package missing database.dump or uploads.tar.gz"
  ls -la "${WORK_DIR}"
  exit 1
fi
if [[ -f "${WORK_DIR}/manifest.json" ]]; then
  echo "==> Manifest:"
  cat "${WORK_DIR}/manifest.json"
  echo
fi

# Refresh host-specific fields in env without replacing secrets.
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

echo "==> Creating Docker volumes"
docker volume create jersey-commerce-prod_postgres_data >/dev/null
docker volume create jersey-commerce-prod_redis_data >/dev/null
docker volume create jersey-commerce-prod_api_uploads >/dev/null

echo "==> Restoring uploads into jersey-commerce-prod_api_uploads"
docker run --rm \
  -v jersey-commerce-prod_api_uploads:/data \
  -v "${WORK_DIR}:/backup:ro" \
  alpine sh -c 'rm -rf /data/* /data/.[!.]* 2>/dev/null || true; tar xzf /backup/uploads.tar.gz -C /data'

echo "==> Starting postgres only"
export COMPOSE_PARALLEL_LIMIT=1
"${COMPOSE[@]}" up -d postgres

echo "==> Waiting for postgres"
for _ in $(seq 1 60); do
  if "${COMPOSE[@]}" exec -T postgres pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "==> Restoring database (pg_restore --clean --if-exists)"
cat "${WORK_DIR}/database.dump" | "${COMPOSE[@]}" exec -T postgres \
  pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists --no-owner --no-acl || {
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

echo "==> Full-app restore complete."
