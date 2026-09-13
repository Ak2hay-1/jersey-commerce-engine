#!/usr/bin/env bash
# Run on the OLD Jerzyfy API VM (e.g. 45.76.61.16) during cutover.
# Stops the API (write freeze), dumps Postgres + uploads, leaves postgres running.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

OUT_DIR="${1:-/root/jerzyfy-migrate}"
COMPOSE=(docker compose -f infra/docker/docker-compose.api.yml --env-file infra/docker/.env.production)

if [[ ! -f infra/docker/.env.production ]]; then
  echo "Missing infra/docker/.env.production"
  exit 1
fi

set -a
# shellcheck disable=SC1091
. infra/docker/.env.production
set +a

mkdir -p "$OUT_DIR"

echo "==> Stopping API (write freeze)"
"${COMPOSE[@]}" stop api || true

echo "==> Dumping Postgres → ${OUT_DIR}/jersey_commerce.dump"
"${COMPOSE[@]}" exec -T postgres \
  pg_dump -U "${POSTGRES_USER}" -Fc "${POSTGRES_DB}" > "${OUT_DIR}/jersey_commerce.dump"

echo "==> Archiving uploads volume → ${OUT_DIR}/api_uploads.tar.gz"
docker run --rm \
  -v jersey-commerce-prod_api_uploads:/data:ro \
  -v "${OUT_DIR}:/backup" \
  alpine tar czf /backup/api_uploads.tar.gz -C /data .

echo "==> Copying .env.production (secrets) → ${OUT_DIR}/env.production.copy"
cp infra/docker/.env.production "${OUT_DIR}/env.production.copy"
chmod 600 "${OUT_DIR}/env.production.copy"

echo "==> Export complete:"
ls -lh "${OUT_DIR}/jersey_commerce.dump" "${OUT_DIR}/api_uploads.tar.gz" "${OUT_DIR}/env.production.copy"
echo
echo "Next: scp -r ${OUT_DIR} root@NEW_VM:/root/"
echo "Then on NEW_VM: bash infra/docker/cohost-import.sh /root/jerzyfy-migrate"
