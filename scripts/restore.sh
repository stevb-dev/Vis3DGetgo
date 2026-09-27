#!/bin/sh
# Restore a backup created by backup.sh.
# Usage:   bash scripts/restore.sh <backup_dir>          (uses the newest files in the dir)
#          bash scripts/restore.sh <backup_dir> <stamp>  (e.g. 20260927-120000)
# Env:     COMPOSE_FILE (default docker-compose.prod.yml)
#          POSTGRES_USER / POSTGRES_DB (default postgres / thesis)
set -e

COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.prod.yml}
PG_USER=${POSTGRES_USER:-postgres}
PG_DB=${POSTGRES_DB:-thesis}

DIR=${1:?usage: restore.sh <backup_dir> [stamp]}
STAMP=${2:-}

SQL="$DIR/db_${STAMP:-*}.sql"
TAR="$DIR/files_${STAMP:-*}.tar.gz"
SQL=$(ls -t $SQL 2>/dev/null | head -1)
TAR=$(ls -t $TAR 2>/dev/null | head -1)

if [ -z "$SQL" ]; then echo "[restore] No db_*.sql found in $DIR"; exit 1; fi
if [ -z "$TAR" ]; then echo "[restore] No files_*.tar.gz found in $DIR"; exit 1; fi

echo "[restore] Restoring database from $SQL"
docker compose -f "$COMPOSE_FILE" exec -T db psql -U "$PG_USER" -d "$PG_DB" < "$SQL"

echo "[restore] Restoring files from $TAR"
docker compose -f "$COMPOSE_FILE" exec -T api sh -c "tar -xzf - -C /app" < "$TAR"

echo "[restore] Done."
