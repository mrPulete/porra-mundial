#!/bin/sh
set -e

echo "Running database migrations..."
node node_modules/prisma/build/index.js migrate deploy

echo "Generating Prisma client for runtime safety..."
node node_modules/prisma/build/index.js generate --schema=prisma/schema.prisma

echo "Ensuring admin user exists..."
node_modules/.bin/tsx prisma/ensure-admin.ts

echo "Starting Next.js server..."
exec "$@"
