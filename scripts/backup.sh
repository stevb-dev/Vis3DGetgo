#!/bin/sh
# Backup the database and file volumes into a timestamped archive.
# Usage:   bash scripts/backup.sh
# Env:     COMPOSE_FILE (default docker-compose.prod.yml)
#          POSTGRES_USER / POSTGRES_DB (default postgres / thesis)
#          BACKUP_DIR (default ./backups), BACKUP_KEEP (default 7)
set -e

COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.prod.yml}
PG_USER=${POSTGRES_USER:-postgres}
PG_DB=${POSTGRES_DB:-thesis}
OUT_DIR=${BACKUP_DIR:-./backups}
KEEP=${BACKUP_KEEP:-7}

STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$OUT_DIR"

echo "[backup] Dumping database -> $OUT_DIR/db_$STAMP.sql"
docker compose -f "$COMPOSE_FILE" exec -T db pg_dump -U "$PG_USER" "$PG_DB" > "$OUT_DIR/db_$STAMP.sql"

echo "[backup] Archiving uploads + models -> $OUT_DIR/files_$STAMP.tar.gz"
docker compose -f "$COMPOSE_FILE" exec -T api tar -czf - -C /app uploads models > "$OUT_DIR/files_$STAMP.tar.gz"

# Rotation: keep the last KEEP archives of each kind.
ls -t "$OUT_DIR"/db_*.sql 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
ls -t "$OUT_DIR"/files_*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

echo "[backup] Done:"
ls -la "$OUT_DIR"
