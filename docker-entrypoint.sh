#!/bin/sh
set -e

echo "Running database migrations..."
node node_modules/prisma/build/index.js migrate deploy

echo "Ensuring database schema is in sync..."
node node_modules/prisma/build/index.js db push --skip-generate

echo "Generating Prisma client for runtime safety..."
node node_modules/prisma/build/index.js generate --schema=prisma/schema.prisma

echo "Ensuring admin user exists..."
node_modules/.bin/tsx prisma/ensure-admin.ts

echo "Starting Next.js server..."
exec "$@"
