#!/bin/sh
set -e
# SQLite lives on the mounted volume so data survives redeploys.
export DATABASE_URL="file:/data/prod.db"
cd /app/apps/api

if [ ! -f /data/prod.db ]; then
  echo "no db yet -> push schema + seed"
  bunx prisma db push
  bunx prisma db seed
fi

exec bun src/main.ts
