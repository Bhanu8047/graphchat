#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/trchat}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

: "${API_IMAGE:?API_IMAGE is required.}"
: "${WEB_IMAGE:?WEB_IMAGE is required.}"

cd "$APP_DIR"

if [ ! -f .env.prod ]; then
  echo "Missing $APP_DIR/.env.prod. Create it from .env.prod.example before deploying." >&2
  exit 1
fi

mkdir -p .deploy certbot/www

if [ -f .deploy/current.env ]; then
  cp .deploy/current.env .deploy/previous.env
fi

cat >.deploy/current.env <<EOF
API_IMAGE=$API_IMAGE
WEB_IMAGE=$WEB_IMAGE
DEPLOYED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

docker compose --env-file .env.prod --env-file .deploy/current.env -f "$COMPOSE_FILE" pull api web
docker compose --env-file .env.prod --env-file .deploy/current.env -f "$COMPOSE_FILE" up -d --remove-orphans

for attempt in $(seq 1 30); do
  if docker compose --env-file .env.prod --env-file .deploy/current.env -f "$COMPOSE_FILE" exec -T api \
    node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
    break
  fi

  if [ "$attempt" -eq 30 ]; then
    echo "API health check failed after deploy." >&2
    exit 1
  fi

  sleep 5
done

for attempt in $(seq 1 30); do
  if docker compose --env-file .env.prod --env-file .deploy/current.env -f "$COMPOSE_FILE" exec -T web \
    node -e "fetch('http://127.0.0.1:3000').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
    break
  fi

  if [ "$attempt" -eq 30 ]; then
    echo "Web health check failed after deploy." >&2
    exit 1
  fi

  sleep 5
done

docker compose --env-file .env.prod --env-file .deploy/current.env -f "$COMPOSE_FILE" ps
