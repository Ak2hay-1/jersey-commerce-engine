#!/usr/bin/env bash
# Re-run after Cloudflare A for api.jerzyfy.in points at this VM (95.135.254.73).
set -euo pipefail
cd /opt/jersey
export API_HOST="${API_HOST:-api.jerzyfy.in}"
export ACME_EMAIL="${ACME_EMAIL:-rkyves.com@gmail.com}"
bash infra/docker/cohost-install-nginx.sh
curl -fsS "https://${API_HOST}/health"
curl -fsS "https://${API_HOST}/ready"
echo
echo "TLS ready."
