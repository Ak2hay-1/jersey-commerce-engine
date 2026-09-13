#!/usr/bin/env bash
# Build and start the cohost API stack (postgres + redis + api on 127.0.0.1:4000).
# TLS is terminated by the host nginx (Cullinos pattern). See COHOST-CUTOVER.md.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

COMPOSE=(
  docker compose
  -f infra/docker/docker-compose.api.yml
  -f infra/docker/docker-compose.cohost.yml
  --env-file infra/docker/.env.production
)

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
  echo "Set PUBLIC_IP in infra/docker/.env.production."
  exit 1
fi

if [[ -z "${API_HOST:-}" || "${API_HOST}" == "api.example.com" ]]; then
  echo "Set API_HOST in infra/docker/.env.production (nginx server_name / DNS)."
  exit 1
fi

if [[ -z "${CORS_ORIGINS:-}" ]]; then
  echo "Set CORS_ORIGINS (storefront + staff portal origins)."
  exit 1
fi

export COMPOSE_PARALLEL_LIMIT=1

echo "==> Ensuring external Docker volumes exist"
docker volume create jersey-commerce-prod_postgres_data >/dev/null
docker volume create jersey-commerce-prod_redis_data >/dev/null
docker volume create jersey-commerce-prod_api_uploads >/dev/null

echo "==> Building api"
"${COMPOSE[@]}" build api

echo "==> Starting stack (postgres, redis, api) — no Caddy"
"${COMPOSE[@]}" up -d postgres redis api

echo "==> Waiting for API health on loopback (http://127.0.0.1:4000/health)"
for i in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:4000/health" >/dev/null 2>&1; then
    echo "API is healthy on 127.0.0.1:4000."
    if curl -fsS "https://${API_HOST}/health" >/dev/null 2>&1; then
      echo "Public https://${API_HOST}/health is also OK (nginx + cert ready)."
    else
      echo "Loopback OK. Public https://${API_HOST}/health not ready yet — install nginx site + certbot (see COHOST-CUTOVER.md)."
    fi
    exit 0
  fi
  sleep 5
done

echo "Stack started but http://127.0.0.1:4000/health is not ready yet."
echo "Check: ${COMPOSE[*]} logs api"
exit 1
