#!/bin/sh
set -e

# Ensure data directory and storage exist
mkdir -p /app/data /app/storage

# If DATABASE_URL is PostgreSQL, automatically ensure tables exist
if echo "$DATABASE_URL" | grep -qE "postgres|postgresql"; then
  echo "[spanqc-web] Ensuring database schema is synced with PostgreSQL..."
  npx prisma db push --skip-generate || echo "[spanqc-web] DB sync check finished."
elif [ ! -f /app/data/dev.db ]; then
  echo "[spanqc-web] Initializing local database file at /app/data/dev.db..."
  if [ -f /app/prisma/dev.db ]; then
    cp /app/prisma/dev.db /app/data/dev.db
  else
    touch /app/data/dev.db
  fi
fi

exec "$@"
