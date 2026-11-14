#!/usr/bin/env bash
# On the cohost VM: set R2 backup env, redeploy API, confirm auto-enable.
# Usage (from /opt/jersey):
#   export BACKUP_ENCRYPTION_KEY='...'
#   export R2_ACCOUNT_ID='...'
#   export R2_ACCESS_KEY_ID='...'
#   export R2_SECRET_ACCESS_KEY='...'
#   export R2_BACKUP_BUCKET=jerzyfy-backups
#   bash infra/docker/enable-r2-backups-on-host.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ENV_FILE=infra/docker/.env.production
test -f "$ENV_FILE"

: "${BACKUP_ENCRYPTION_KEY:?Set BACKUP_ENCRYPTION_KEY}"
: "${R2_ACCOUNT_ID:?Set R2_ACCOUNT_ID}"
: "${R2_ACCESS_KEY_ID:?Set R2_ACCESS_KEY_ID}"
: "${R2_SECRET_ACCESS_KEY:?Set R2_SECRET_ACCESS_KEY}"
R2_BACKUP_BUCKET="${R2_BACKUP_BUCKET:-jerzyfy-backups}"

for key in BACKUP_ENCRYPTION_KEY R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BACKUP_BUCKET R2_ENDPOINT; do
  sed -i "/^${key}=/d" "$ENV_FILE"
done

{
  echo "BACKUP_ENCRYPTION_KEY=${BACKUP_ENCRYPTION_KEY}"
  echo "R2_ACCOUNT_ID=${R2_ACCOUNT_ID}"
  echo "R2_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID}"
  echo "R2_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY}"
  echo "R2_BACKUP_BUCKET=${R2_BACKUP_BUCKET}"
} >> "$ENV_FILE"

echo "==> Updated R2 / backup keys in $ENV_FILE (values redacted)"
grep -E '^(BACKUP_ENCRYPTION_KEY|R2_ACCOUNT_ID|R2_ACCESS_KEY_ID|R2_SECRET_ACCESS_KEY|R2_BACKUP_BUCKET)=' "$ENV_FILE" \
  | sed -E 's/=.*/=***set***/'

git fetch origin
git reset --hard origin/main
chmod +x infra/docker/prod-up-cohost.sh infra/docker/enable-r2-backups-on-host.sh
bash infra/docker/prod-up-cohost.sh

echo "==> Waiting for API health"
for i in $(seq 1 40); do
  if curl -fsS http://127.0.0.1:4100/health >/dev/null 2>&1; then
    echo "API healthy"
    break
  fi
  sleep 3
done
curl -fsS http://127.0.0.1:4100/health || true

echo "==> Backup settings (should be enabled after auto-bootstrap)"
docker compose \
  -f infra/docker/docker-compose.api.yml \
  -f infra/docker/docker-compose.cohost.yml \
  --env-file infra/docker/.env.production \
  exec -T postgres \
  psql -U jersey -d jersey_commerce -c \
  "SELECT t.slug, b.enabled, b.destination_path, b.interval_value, b.interval_unit, b.schedule_time, b.next_run_at
   FROM tenants t
   LEFT JOIN backup_settings b ON b.tenant_id = t.id
   ORDER BY t.slug;"

echo "==> Done. Trigger Run backup now in Admin if next_run_at is in the future, or wait for the scheduler."
