#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/trchat}"
DEPLOY_USER="${DEPLOY_USER:-${SUDO_USER:-$USER}}"
SSH_PORT="${SSH_PORT:-22}"
SSH_PASSWORD_AUTH="${SSH_PASSWORD_AUTH:-no}"
SSH_PERMIT_ROOT_LOGIN="${SSH_PERMIT_ROOT_LOGIN:-prohibit-password}"
SSH_MAX_AUTH_TRIES="${SSH_MAX_AUTH_TRIES:-3}"
SSH_LOGIN_GRACE_TIME="${SSH_LOGIN_GRACE_TIME:-30s}"

if [ "$DEPLOY_USER" = "root" ]; then
  DEPLOY_HOME="/root"
else
  DEPLOY_HOME="/home/$DEPLOY_USER"
fi

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script with sudo." >&2
  exit 1
fi

if [ "$SSH_PASSWORD_AUTH" = "no" ] && [ ! -s "$DEPLOY_HOME/.ssh/authorized_keys" ]; then
  echo "Refusing to disable SSH password auth because $DEPLOY_HOME/.ssh/authorized_keys is missing or empty." >&2
  echo "Set SSH_PASSWORD_AUTH=yes for a transitional bootstrap, or install an SSH key for $DEPLOY_USER first." >&2
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

install -m 0755 -d /etc/ssh/sshd_config.d
cat >/etc/ssh/sshd_config.d/99-trchat-hardening.conf <<EOF
Port $SSH_PORT
PasswordAuthentication $SSH_PASSWORD_AUTH
KbdInteractiveAuthentication no
UsePAM yes
PermitRootLogin $SSH_PERMIT_ROOT_LOGIN
PubkeyAuthentication yes
MaxAuthTries $SSH_MAX_AUTH_TRIES
LoginGraceTime $SSH_LOGIN_GRACE_TIME
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
EOF

install -m 0755 -d /etc/fail2ban/jail.d
cat >/etc/fail2ban/jail.d/sshd.local <<EOF
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 4
bantime.increment = true
bantime.factor = 2
bantime.maxtime = 24h

[sshd]
enabled = true
port = $SSH_PORT
backend = systemd

[recidive]
enabled = true
logpath = /var/log/fail2ban.log
bantime = 1w
findtime = 1d
maxretry = 5
EOF

sshd -t

firewall-cmd --permanent --remove-service=ssh || true
firewall-cmd --permanent --add-port=${SSH_PORT}/tcp
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload

systemctl restart sshd
systemctl restart fail2ban

install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR/certbot/www"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"

cat >/etc/cron.d/trchat-certbot <<EOF
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
15 3 * * * root APP_DIR=$APP_DIR $APP_DIR/scripts/vps/renew-certs.sh
EOF
chmod 644 /etc/cron.d/trchat-certbot

echo "Bootstrap complete. SSH is configured on port $SSH_PORT with PasswordAuthentication=$SSH_PASSWORD_AUTH and PermitRootLogin=$SSH_PERMIT_ROOT_LOGIN."
echo "Log out and back in so Docker group membership applies for $DEPLOY_USER."