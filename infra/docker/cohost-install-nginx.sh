#!/usr/bin/env bash
# Install Jerzyfy API nginx site on the shared Cullinos VM and obtain a Let's Encrypt cert.
# Safe to re-run. Does not touch Cullinos site configs.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

API_HOST="${API_HOST:-api.jerzyfy.in}"
SITE_SRC="${ROOT}/infra/docker/nginx-jerzyfy-api.conf"
SITE_AVAILABLE="/etc/nginx/sites-available/${API_HOST}.conf"
SITE_ENABLED="/etc/nginx/sites-enabled/${API_HOST}.conf"

if [[ ! -f "$SITE_SRC" ]]; then
  echo "Missing $SITE_SRC"
  exit 1
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root (needed for /etc/nginx and certbot)."
  exit 1
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "nginx not found — Cullinos expects nginx on this host."
  exit 1
fi

if ! curl -fsS "http://127.0.0.1:4000/health" >/dev/null 2>&1; then
  echo "Jerzyfy API not healthy on 127.0.0.1:4000 — run prod-up-cohost.sh first."
  exit 1
fi

echo "==> Installing nginx site for ${API_HOST}"
# First-time install: use HTTP-only snippet so certbot can obtain certs before ssl_* paths exist.
TMP="$(mktemp)"
cat >"$TMP" <<EOF
upstream jerzyfy_api {
    server 127.0.0.1:4000;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${API_HOST};

    client_max_body_size 25m;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location /realtime {
        proxy_pass http://jerzyfy_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    location / {
        proxy_pass http://jerzyfy_api;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 10s;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}
EOF

cp "$TMP" "$SITE_AVAILABLE"
rm -f "$TMP"
ln -sfn "$SITE_AVAILABLE" "$SITE_ENABLED"

nginx -t
systemctl reload nginx

if command -v certbot >/dev/null 2>&1; then
  echo "==> Requesting/renewing certificate for ${API_HOST}"
  certbot --nginx -d "${API_HOST}" --non-interactive --agree-tos --redirect \
    --register-unsafely-without-email || \
  certbot --nginx -d "${API_HOST}" --non-interactive --agree-tos --redirect
else
  echo "certbot not installed — obtain TLS manually, then enable HTTPS."
fi

nginx -t
systemctl reload nginx

echo "==> Smoke"
curl -fsS "https://${API_HOST}/health" && echo
curl -fsS "https://${API_HOST}/ready" && echo
echo "nginx site for ${API_HOST} is live."
