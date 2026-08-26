#!/usr/bin/env bash
# Build and start the hybrid API stack (postgres + redis + api + Caddy TLS).
# Storefront and staff portal (Admin+ERP+POS) are on Vercel.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f infra/docker/docker-compose.api.yml --env-file infra/docker/.env.production)

if [[ ! -f infra/docker/.env.production ]]; then
  echo "Missing infra/docker/.env.production"
  echo "Copy .env.production.example and set API_HOST, PUBLIC_IP, CORS_ORIGINS, and secrets."
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

if [[ -z "${API_HOST:-}" || "${API_HOST}" == "api.example.com" ]]; then
  echo "Set API_HOST in infra/docker/.env.production (DNS must point at this VM)."
  exit 1
fi

if [[ -z "${CORS_ORIGINS:-}" ]]; then
  echo "Set CORS_ORIGINS (storefront + staff portal Vercel URLs)."
  exit 1
fi

export COMPOSE_PARALLEL_LIMIT=1

echo "==> Building api"
"${COMPOSE[@]}" build api

echo "==> Starting stack (postgres, redis, api, caddy)"
"${COMPOSE[@]}" up -d

echo "==> Waiting for API health via Caddy (https://${API_HOST}/health)"
for i in $(seq 1 60); do
  if curl -fsS "https://${API_HOST}/health" >/dev/null 2>&1; then
    echo "API is healthy."
    exit 0
  fi
  sleep 5
done

echo "Stack started but https://${API_HOST}/health is not ready yet."
echo "Check DNS, ports 80/443, and: docker compose -f infra/docker/docker-compose.api.yml logs caddy api"
exit 0
