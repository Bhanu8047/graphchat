#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/trchat}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
MAX_HEALTH_CHECK_ATTEMPTS="${MAX_HEALTH_CHECK_ATTEMPTS:-30}"
HEALTH_CHECK_TIMEOUT_SECONDS=$((MAX_HEALTH_CHECK_ATTEMPTS * 5))

: "${API_IMAGE:?API_IMAGE is required.}"
: "${WEB_IMAGE:?WEB_IMAGE is required.}"

cd "$APP_DIR"

if [ ! -f .env.prod ]; then
  echo "Missing $APP_DIR/.env.prod. Populate it before deploying or provide it via the PROD_ENV_FILE deployment secret." >&2
  exit 1
fi

mkdir -p .deploy certbot/www

if [ -f .deploy/current.env ]; then
  cp .deploy/current.env .deploy/previous.env
fi

cat >.deploy/current.env <<EOF
API_IMAGE=$API_IMAGE
WEB_IMAGE=$WEB_IMAGE
DEPLOYED_AT=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
EOF

docker compose --env-file .env.prod --env-file .deploy/current.env -f "$COMPOSE_FILE" pull api web
docker compose --env-file .env.prod --env-file .deploy/current.env -f "$COMPOSE_FILE" up -d --remove-orphans

for attempt in $(seq 1 "$MAX_HEALTH_CHECK_ATTEMPTS"); do
  if docker compose --env-file .env.prod --env-file .deploy/current.env -f "$COMPOSE_FILE" exec -T api \
    node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
    break
  fi

  if [ "$attempt" -eq "$MAX_HEALTH_CHECK_ATTEMPTS" ]; then
    echo "API health check failed after $HEALTH_CHECK_TIMEOUT_SECONDS seconds. Inspect logs with: docker compose --env-file .env.prod --env-file .deploy/current.env -f $COMPOSE_FILE logs api" >&2
    exit 1
  fi

  sleep 5
done

for attempt in $(seq 1 "$MAX_HEALTH_CHECK_ATTEMPTS"); do
  if docker compose --env-file .env.prod --env-file .deploy/current.env -f "$COMPOSE_FILE" exec -T web \
    node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
    break
  fi

  if [ "$attempt" -eq "$MAX_HEALTH_CHECK_ATTEMPTS" ]; then
    echo "Web health check failed after $HEALTH_CHECK_TIMEOUT_SECONDS seconds. Inspect logs with: docker compose --env-file .env.prod --env-file .deploy/current.env -f $COMPOSE_FILE logs web" >&2
    exit 1
  fi

  sleep 5
done

docker compose --env-file .env.prod --env-file .deploy/current.env -f "$COMPOSE_FILE" ps
