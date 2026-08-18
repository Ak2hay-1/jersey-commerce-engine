#!/bin/sh
set -e

cd /app/apps/api
export PATH="/app/node_modules/.bin:$PATH"

echo "Applying Prisma migrations..."
prisma migrate deploy --schema=./prisma/schema.prisma

echo "Starting API on port ${PORT:-4000}..."
exec node dist/main.js
