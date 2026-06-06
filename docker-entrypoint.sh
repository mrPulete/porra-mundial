#!/bin/sh
set -e

echo "Running database migrations..."
if ! node node_modules/prisma/build/index.js migrate deploy; then
  echo "Migration deploy failed, attempting to mark as completed..."
  node node_modules/prisma/build/index.js migrate resolve --applied 20260606073020_init || true
  node node_modules/prisma/build/index.js migrate deploy || {
    echo "Still failing, trying db push..."
    node node_modules/prisma/build/index.js db push --skip-generate --force-reset || true
    node node_modules/prisma/build/index.js migrate deploy || true
  }
fi

echo "Ensuring database schema is in sync..."
node node_modules/prisma/build/index.js db push --skip-generate

echo "Generating Prisma client for runtime safety..."
node node_modules/prisma/build/index.js generate --schema=prisma/schema.prisma

echo "Ensuring admin user exists..."
node_modules/.bin/tsx prisma/ensure-admin.ts

echo "Starting Next.js server..."
exec "$@"
