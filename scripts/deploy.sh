#!/usr/bin/env bash
# Деплой/оновлення на VPS. Запускати після git pull:
#   git pull && ./scripts/deploy.sh

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$HERE"

if [[ ! -f .env ]]; then
  echo "ERROR: .env file is missing. Скопіюйте .env.example → .env і заповніть." >&2
  exit 1
fi

echo "==> Збираємо образи..."
docker compose build

echo "==> Запускаємо стек..."
docker compose up -d

echo "==> Чекаємо на готовність бази..."
until docker compose exec -T db pg_isready -U "${POSTGRES_USER:-marina}" >/dev/null 2>&1; do
  sleep 1
done

echo "==> Застосовуємо міграції..."
docker compose exec -T api alembic upgrade head

echo "==> Готово. Перевірка здоровʼя:"
docker compose exec -T api python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/api/healthz').read().decode())"
