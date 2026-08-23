#!/usr/bin/env bash
# Pull latest main on the API VM and rebuild the stack (includes prisma migrate deploy).
set -euo pipefail
cd /opt/jersey
git fetch origin
git reset --hard origin/main
echo "==> Deploying $(git log -1 --oneline)"
bash infra/docker/prod-up.sh
echo "==> Applying Jerzyfy shipping rules (free delivery above INR 2000)"
docker compose -f infra/docker/docker-compose.api.yml --env-file infra/docker/.env.production exec -T postgres \
  psql -U jersey -d jersey_commerce -c \
  "UPDATE tenants SET shipping_calculation_mode = 'FIXED', shipping_fixed_amount = 99, free_shipping_min_subtotal = 2000 WHERE slug = 'jerzyfy';"
