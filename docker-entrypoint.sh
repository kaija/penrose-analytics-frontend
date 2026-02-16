#!/bin/sh
set -e

echo "==> Prism CDP Container Starting..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set"
  exit 1
fi

echo "==> Running Prisma migrations..."
if npx prisma migrate deploy; then
  echo "==> Migrations completed successfully"
else
  echo "ERROR: Migration failed"
  exit 1
fi

echo "==> Starting application..."
exec "$@"
