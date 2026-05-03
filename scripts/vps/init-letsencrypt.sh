#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/trchat}"
CERT_NAME="${CERT_NAME:-trchat.co}"
DOMAINS="${DOMAINS:-trchat.co api.trchat.co}"

: "${EMAIL:?Set EMAIL to the Lets Encrypt registration email address.}"

cd "$APP_DIR"
mkdir -p certbot/www

tmp_conf="$(mktemp)"
cat >"$tmp_conf" <<'EOF'
server {
  listen 80;
  server_name _;

  location /.well-known/acme-challenge/ {
    root /var/www/certbot;
  }

  location / {
    return 404;
  }
}
EOF

docker rm -f trchat-certbot-nginx >/dev/null 2>&1 || true
docker run -d --name trchat-certbot-nginx \
  -p 80:80 \
  -v "$APP_DIR/certbot/www:/var/www/certbot:z" \
  -v "$tmp_conf:/etc/nginx/conf.d/default.conf:ro,z" \
  nginx:1.27-alpine

domain_args=()
for domain in $DOMAINS; do
  domain_args+=("-d" "$domain")
done

docker run --rm \
  -v /etc/letsencrypt:/etc/letsencrypt:z \
  -v "$APP_DIR/certbot/www:/var/www/certbot:z" \
  certbot/certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --cert-name "$CERT_NAME" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --non-interactive \
  "${domain_args[@]}"

docker rm -f trchat-certbot-nginx >/dev/null
rm -f "$tmp_conf"

echo "Issued certificate $CERT_NAME for: $DOMAINS"
