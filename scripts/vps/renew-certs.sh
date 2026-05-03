#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/trchat}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
LOG_FILE="${LOG_FILE:-/var/log/trchat-certbot.log}"

cd "$APP_DIR"

if [ ! -f .deploy/current.env ]; then
  echo "Skipping certificate renewal: .deploy/current.env is missing." >>"$LOG_FILE"
  exit 0
fi

docker compose --env-file .env.prod --env-file .deploy/current.env -f "$COMPOSE_FILE" run --rm certbot renew --webroot -w /var/www/certbot >>"$LOG_FILE" 2>&1
docker compose --env-file .env.prod --env-file .deploy/current.env -f "$COMPOSE_FILE" exec -T nginx nginx -s reload >>"$LOG_FILE" 2>&1
