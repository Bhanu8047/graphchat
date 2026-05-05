#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/graphchat}"
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

apt-get update
apt-get install -y ca-certificates curl gnupg ufw fail2ban unattended-upgrades openssl

install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.asc ]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
fi

. /etc/os-release
cat >/etc/apt/sources.list.d/docker.list <<EOF
deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable
EOF

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

usermod -aG docker "$DEPLOY_USER"

install -m 0755 -d /etc/ssh/sshd_config.d
cat >/etc/ssh/sshd_config.d/99-graphchat-hardening.conf <<EOF
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
banaction = ufw
bantime = 1w
findtime = 1d
maxretry = 5
EOF

sshd -t

ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw limit "$SSH_PORT/tcp"
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

systemctl restart ssh
systemctl enable --now fail2ban
systemctl restart fail2ban
dpkg-reconfigure -f noninteractive unattended-upgrades

install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR/certbot/www"

cat >/etc/cron.d/graphchat-certbot <<EOF
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
15 3 * * * root APP_DIR=$APP_DIR $APP_DIR/scripts/vps/renew-certs.sh
EOF

echo "Bootstrap complete. SSH is configured on port $SSH_PORT with PasswordAuthentication=$SSH_PASSWORD_AUTH and PermitRootLogin=$SSH_PERMIT_ROOT_LOGIN."
echo "Log out and back in so Docker group membership applies for $DEPLOY_USER."
