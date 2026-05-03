#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/trchat}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

cd "$APP_DIR"

if [ ! -f .deploy/previous.env ]; then
  echo "No previous deployment metadata found at $APP_DIR/.deploy/previous.env." >&2
  exit 1
fi

cp .deploy/current.env .deploy/failed.env
cp .deploy/previous.env .deploy/current.env

docker compose --env-file .env.prod --env-file .deploy/current.env -f "$COMPOSE_FILE" pull api web
docker compose --env-file .env.prod --env-file .deploy/current.env -f "$COMPOSE_FILE" up -d --remove-orphans
docker compose --env-file .env.prod --env-file .deploy/current.env -f "$COMPOSE_FILE" ps
