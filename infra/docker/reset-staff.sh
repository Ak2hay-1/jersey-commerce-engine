#!/usr/bin/env bash
# Reset staff accounts on the production API VM (run on the VM as root).
set -euo pipefail

TENANT_SLUG="${1:-jerzyfy}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ ! -f infra/docker/.env.production ]]; then
  echo "Missing infra/docker/.env.production"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source infra/docker/.env.production
set +a

COMPOSE=(docker compose -f infra/docker/docker-compose.api.yml --env-file infra/docker/.env.production)
STAFF_PASSWORD="${STAFF_PASSWORD:-DevPassword123!}"

echo "Resetting staff for tenant: ${TENANT_SLUG}"

"${COMPOSE[@]}" cp apps/api/prisma/reset-staff.cjs api:/app/apps/api/prisma/reset-staff.cjs

"${COMPOSE[@]}" exec -T api \
  env TENANT_SLUG="$TENANT_SLUG" STAFF_PASSWORD="$STAFF_PASSWORD" \
  node prisma/reset-staff.cjs
