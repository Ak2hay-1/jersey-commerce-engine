#!/bin/sh
set -e

cd /app/apps/api
export PATH="/app/node_modules/.bin:$PATH"

# Volumes created by older images are root-owned; hand them to the unprivileged runtime user, then drop root.
if [ "$(id -u)" = "0" ]; then
  for dir in /app/apps/api/uploads /backups; do
    if [ -d "$dir" ]; then
      chown -R node:node "$dir" 2>/dev/null || echo "warning: could not chown $dir"
    fi
  done
  exec su-exec node "$0" "$@"
fi

echo "Applying Prisma migrations..."
prisma migrate deploy --schema=./prisma/schema.prisma

echo "Starting API on port ${PORT:-4000}..."
exec node dist/main.js
