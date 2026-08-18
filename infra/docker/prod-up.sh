#!/usr/bin/env bash
# Build and start production on the VM. Does not require Node.js on the host.
# Builds one image at a time so a 4GB VM does not OOM or starve font/network fetches.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f infra/docker/docker-compose.prod.yml --env-file infra/docker/.env.production)

if [[ ! -f infra/docker/.env.production ]]; then
  echo "Missing infra/docker/.env.production"
  echo "Copy the example and set PUBLIC_IP plus secrets first."
  exit 1
fi

set -a
# shellcheck disable=SC1091
. infra/docker/.env.production
set +a

if [[ -z "${PUBLIC_IP:-}" || "${PUBLIC_IP}" == "REPLACE_WITH_VULTR_IP" ]]; then
  echo "Set PUBLIC_IP in infra/docker/.env.production to your Vultr IPv4 address."
  exit 1
fi

export COMPOSE_PARALLEL_LIMIT=1

for service in api storefront admin pos; do
  echo "==> Building $service"
  "${COMPOSE[@]}" build "$service"
done

echo "==> Starting stack"
"${COMPOSE[@]}" up -d
