#!/bin/sh
set -e

DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"

echo "[entrypoint] Waiting for database at ${DB_HOST}:${DB_PORT}..."
until node -e "require('net').connect({ port: ${DB_PORT}, host: '${DB_HOST}' }).on('error', () => process.exit(1))"; do
  sleep 2
done

echo "[entrypoint] Running migrations..."
npx prisma migrate deploy

if [ "$SEED_ON_START" = "true" ]; then
  echo "[entrypoint] Seeding database..."
  npx tsx prisma/seed.ts
fi

echo "[entrypoint] Starting server..."
exec npm start
