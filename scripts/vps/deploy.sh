#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/trchat}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
MAX_HEALTH_CHECK_ATTEMPTS="${MAX_HEALTH_CHECK_ATTEMPTS:-30}"
HEALTH_CHECK_TIMEOUT_SECONDS=$((MAX_HEALTH_CHECK_ATTEMPTS * 5))

cd "$APP_DIR"

if [ ! -f .env.prod ]; then
  echo "Missing $APP_DIR/.env.prod. Populate it before deploying or provide it via the PROD_ENV_FILE deployment secret." >&2
  exit 1
fi

mkdir -p .deploy certbot/www

candidate_env=.deploy/candidate.env
current_env=.deploy/current.env

requested_api_image="${API_IMAGE:-}"
requested_web_image="${WEB_IMAGE:-}"
requested_graph_service_image="${GRAPH_SERVICE_IMAGE:-}"
existing_api_image=""
existing_web_image=""
existing_graph_service_image=""

if [ -f "$current_env" ]; then
  while IFS='=' read -r key value; do
    case "$key" in
      API_IMAGE) existing_api_image="$value" ;;
      WEB_IMAGE) existing_web_image="$value" ;;
      GRAPH_SERVICE_IMAGE) existing_graph_service_image="$value" ;;
    esac
  done < "$current_env"
fi

API_IMAGE="${requested_api_image:-$existing_api_image}"
WEB_IMAGE="${requested_web_image:-$existing_web_image}"
GRAPH_SERVICE_IMAGE="${requested_graph_service_image:-$existing_graph_service_image}"

: "${API_IMAGE:?API_IMAGE is required. Provide it or deploy once to create .deploy/current.env.}"
: "${WEB_IMAGE:?WEB_IMAGE is required. Provide it or deploy once to create .deploy/current.env.}"
: "${GRAPH_SERVICE_IMAGE:?GRAPH_SERVICE_IMAGE is required. Provide it or deploy once to create .deploy/current.env.}"

cat >"$candidate_env" <<EOF
API_IMAGE=$API_IMAGE
WEB_IMAGE=$WEB_IMAGE
GRAPH_SERVICE_IMAGE=$GRAPH_SERVICE_IMAGE
DEPLOYED_AT=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
EOF

compose() {
  docker compose --env-file .env.prod --env-file "$candidate_env" -f "$COMPOSE_FILE" "$@"
}

service_is_running() {
  local service="$1"

  local container_id
  container_id="$(compose ps -q "$service" 2>/dev/null || true)"

  if [ -z "$container_id" ]; then
    return 1
  fi

  local state
  state="$(docker inspect -f '{{.State.Status}}' "$container_id" 2>/dev/null || true)"
  [ "$state" = "running" ]
}

has_deploy_service() {
  local wanted="$1"

  if [ ${#deploy_services[@]} -eq 0 ]; then
    return 0
  fi

  local service
  for service in "${deploy_services[@]}"; do
    if [ "$service" = "$wanted" ]; then
      return 0
    fi
  done

  return 1
}

wait_for_service_health() {
  local service="$1"
  local check_command="$2"

  for attempt in $(seq 1 "$MAX_HEALTH_CHECK_ATTEMPTS"); do
    if compose exec -T "$service" sh -lc "$check_command"; then
      return 0
    fi

    if [ "$attempt" -eq "$MAX_HEALTH_CHECK_ATTEMPTS" ]; then
      echo "$service health check failed after $HEALTH_CHECK_TIMEOUT_SECONDS seconds. Inspect logs with: docker compose --env-file .env.prod --env-file $candidate_env -f $COMPOSE_FILE logs $service" >&2
      exit 1
    fi

    sleep 5
  done
}

pull_services=()
deploy_services=()

if [ -n "$requested_api_image" ]; then
  pull_services+=(api)
fi

if [ -n "$requested_web_image" ]; then
  pull_services+=(web)
fi

if [ -n "$requested_graph_service_image" ]; then
  pull_services+=(graph-service)
fi

if [ -n "${DEPLOY_SERVICES:-}" ]; then
  # DEPLOY_SERVICES is a space-delimited list of compose services to recreate.
  read -r -a deploy_services <<< "$DEPLOY_SERVICES"
fi

if [ ${#deploy_services[@]} -gt 0 ] && ! has_deploy_service nginx && ! service_is_running nginx; then
  deploy_services+=(nginx)
fi

if [ ${#pull_services[@]} -gt 0 ]; then
  compose pull "${pull_services[@]}"
fi

# Free ports 80/443 before bringing up nginx. This handles cases where an old
# deployment ran under a different Docker Compose project name (e.g. after a
# project rename) and its nginx container is still holding the ports.
for _port in 80 443; do
  _conflict=$(docker ps -q --filter "publish=${_port}")
  if [ -n "$_conflict" ]; then
    echo "Stopping container(s) holding port ${_port}: ${_conflict}"
    docker stop $_conflict || true
  fi
done
unset _port _conflict

if [ ${#deploy_services[@]} -gt 0 ]; then
  compose up -d --no-deps "${deploy_services[@]}"
else
  compose up -d --remove-orphans
fi

if has_deploy_service api; then
  wait_for_service_health api "node -e \"fetch('http://127.0.0.1:3001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""
fi

if has_deploy_service web; then
  wait_for_service_health web "node -e \"fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""
fi

if [ -f "$current_env" ]; then
  cp "$current_env" .deploy/previous.env
fi

mv "$candidate_env" "$current_env"

docker compose --env-file .env.prod --env-file "$current_env" -f "$COMPOSE_FILE" ps
