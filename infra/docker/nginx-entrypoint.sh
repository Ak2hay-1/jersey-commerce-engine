#!/bin/sh
set -e

API_URL="${API_URL:-http://${PUBLIC_IP:-localhost}:4000}"
API_URL="${API_URL%/}"

printf 'window.__JCE_PUBLIC__={apiUrl:"%s",portal:"admin"};\n' "${API_URL}" > /usr/share/nginx/admin/runtime-config.js
printf 'window.__JCE_PUBLIC__={apiUrl:"%s"};\n' "${API_URL}" > /usr/share/nginx/pos/runtime-config.js

exec nginx -g 'daemon off;'
