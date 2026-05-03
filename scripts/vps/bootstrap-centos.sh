#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/trchat}"
DEPLOY_USER="${DEPLOY_USER:-${SUDO_USER:-$USER}}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script with sudo." >&2
  exit 1
fi

dnf install -y dnf-plugins-core ca-certificates curl firewalld cronie openssl dnf-automatic
dnf config-manager --set-enabled crb || true
dnf install -y epel-release
dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

dnf install -y fail2ban docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable --now docker
systemctl enable --now firewalld
systemctl enable --now fail2ban
systemctl enable --now crond
systemctl enable --now dnf-automatic.timer

usermod -aG docker "$DEPLOY_USER"

firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload

install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR/certbot/www"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"

cat >/etc/cron.d/trchat-certbot <<EOF
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
15 3 * * * root APP_DIR=$APP_DIR $APP_DIR/scripts/vps/renew-certs.sh
EOF
chmod 644 /etc/cron.d/trchat-certbot

echo "Bootstrap complete. Log out and back in so Docker group membership applies for $DEPLOY_USER."