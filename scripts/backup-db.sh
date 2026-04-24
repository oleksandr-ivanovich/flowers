#!/usr/bin/env bash
# Бекап бази PostgreSQL з docker-compose stack.
# Запускати з кореня проєкту або через cron:
#   0 3 * * * cd /srv/marina && ./scripts/backup-db.sh >> /var/log/marina-backup.log 2>&1
#
# Зберігає у ./backups/ і ротує файли старше 14 днів.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$HERE"

if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  source .env
fi

: "${POSTGRES_DB:?POSTGRES_DB not set}"
: "${POSTGRES_USER:?POSTGRES_USER not set}"

mkdir -p backups
TS="$(date +%Y%m%d-%H%M%S)"
OUT="backups/${POSTGRES_DB}-${TS}.sql.gz"

docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --clean --if-exists \
  | gzip > "$OUT"

echo "Backup saved: $OUT"

# Rotate (14 days retention)
find backups -name "*.sql.gz" -mtime +14 -delete
