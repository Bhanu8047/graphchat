# VPS deployment

This repository deploys production images from GitHub Actions to a Docker Compose stack on a CentOS 9 VPS.

## Architecture

- `https://trchat.co` routes to the Next.js web container on port `3000`.
- `https://api.trchat.co` routes to the Nest API container on port `3001`.
- MongoDB and Redis are private Docker services and do not publish host ports.
- GitHub Actions builds immutable GHCR images tagged with the Git SHA and deploys those exact tags over SSH.

## DNS records

Create these records before requesting certificates:

```text
A     trchat.co       <VPS_PUBLIC_IPV4>
A     api.trchat.co   <VPS_PUBLIC_IPV4>
AAAA  trchat.co       <VPS_PUBLIC_IPV6>   # optional, only if the VPS has IPv6
AAAA  api.trchat.co   <VPS_PUBLIC_IPV6>   # optional, only if the VPS has IPv6
```

## GitHub secrets

Add these repository secrets:

```text
VPS_HOST      # VPS IP address or hostname
VPS_USER      # SSH user that can run Docker in /opt/trchat
VPS_SSH_KEY   # private key for VPS_USER
VPS_PORT      # optional; defaults to 22 if unset
PROD_ENV_FILE # full contents of /opt/trchat/.env.prod
```

The workflow uses the built-in `GITHUB_TOKEN` for GHCR push/pull during automated deploys and writes `/opt/trchat/.env.prod` from the `PROD_ENV_FILE` repository secret. For manual pulls or rollbacks from another shell, log in to GHCR with a read-capable token first if the package is private.

## VPS environment

Store the full production env file contents in the `PROD_ENV_FILE` repository secret. Example content:

```bash
MONGO_ROOT_PASSWORD=replace-with-a-long-random-password
WEB_URL=https://trchat.co
NEXT_PUBLIC_APP_URL=https://trchat.co
NEXT_PUBLIC_API_URL=https://api.trchat.co/api
APP_SESSION_COOKIE_DOMAIN=.trchat.co

GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
VOYAGE_BASE_URL=https://api.voyageai.com/v1
```

`MONGO_ROOT_PASSWORD` is used both to initialize MongoDB and to compose the API's private `MONGODB_URI`.

`APP_SESSION_COOKIE_DOMAIN` is required when the web app and API are on different subdomains. Without it, the browser stores `vectorgraph_session` only on the web host and authenticated requests to the API return `401 Authentication is required.` For `trchat.co` plus `api.trchat.co`, set it to `.trchat.co`.

## One-time VPS bootstrap

Run the `Bootstrap VPS` GitHub Actions workflow once for a fresh CentOS 9 VPS. It uploads the CentOS bootstrap script, installs Docker and the required system services, and uploads the deployment bundle into `/opt/trchat`.

The bootstrap scripts now also harden SSH by writing an explicit `sshd` drop-in and a dedicated `fail2ban` SSH jail. By default they:

- keep SSH on port `22` unless `SSH_PORT` is provided
- disable SSH password authentication unless `SSH_PASSWORD_AUTH=yes` is provided for a temporary transition
- keep root key login in `prohibit-password` mode unless `SSH_PERMIT_ROOT_LOGIN` is overridden
- cap SSH auth retries and shorten the login grace period
- enable escalating `fail2ban` bans for repeated offenders

Requirements before running it:

- `VPS_USER` must either be `root` or have passwordless `sudo`.
- `PROD_ENV_FILE` must already contain the full production `.env.prod` contents.
- If the application directory owner should differ from `VPS_USER`, pass that username as the workflow's `deploy_user` input.
- If you keep the secure default `SSH_PASSWORD_AUTH=no`, ensure the target login user already has a working `authorized_keys` file before running bootstrap.
- The workflow now accepts optional `ssh_port`, `ssh_password_auth`, and `ssh_permit_root_login` inputs and automatically switches later SSH/SCP steps to the post-bootstrap port.

Equivalent manual bootstrap commands:

```bash
scp scripts/vps/bootstrap-centos.sh <VPS_USER>@<VPS_HOST>:/tmp/bootstrap-centos.sh
ssh <VPS_USER>@<VPS_HOST> 'sudo APP_DIR=/opt/trchat DEPLOY_USER=<VPS_USER> bash /tmp/bootstrap-centos.sh'
```

To move SSH off the default port during bootstrap:

```bash
ssh <VPS_USER>@<VPS_HOST> 'sudo APP_DIR=/opt/trchat DEPLOY_USER=<VPS_USER> SSH_PORT=2222 bash /tmp/bootstrap-centos.sh'
```

If you still need password auth for the first bootstrap session, make that explicit and turn it back off immediately after keys are confirmed:

```bash
ssh <VPS_USER>@<VPS_HOST> 'sudo APP_DIR=/opt/trchat DEPLOY_USER=<VPS_USER> SSH_PASSWORD_AUTH=yes bash /tmp/bootstrap-centos.sh'
```

After bootstrap, log out and back in once so Docker group membership applies for the deploy user.

If you bootstrap manually instead of using the workflow, upload the deployment directory contents after that:

```bash
ssh <VPS_USER>@<VPS_HOST> 'mkdir -p /opt/trchat'
scp docker-compose.prod.yml <VPS_USER>@<VPS_HOST>:/opt/trchat/
scp -r docker scripts <VPS_USER>@<VPS_HOST>:/opt/trchat/
ssh <VPS_USER>@<VPS_HOST> 'cd /opt/trchat && chmod +x scripts/vps/*.sh'
```

After DNS points at the VPS and port 80 is reachable, issue the first Let's Encrypt certificate:

```bash
ssh <VPS_USER>@<VPS_HOST> 'cd /opt/trchat && EMAIL=admin@trchat.co ./scripts/vps/init-letsencrypt.sh'
```

## Deploy flow

Merging to `main` runs:

1. CI: `npm ci`, `npm run format:check`, `npm exec nx typecheck api`, `npm exec nx build api`, and `npm exec nx build web`.
2. CD: builds and pushes:
   - `ghcr.io/bhanu8047/vector-graph-api:<git-sha>`
   - `ghcr.io/bhanu8047/vector-graph-web:<git-sha>`
3. CD uploads the Compose/nginx/scripts bundle to `/opt/trchat`.
4. CD runs `/opt/trchat/scripts/vps/deploy.sh` with exact image tags.
5. CD verifies `https://trchat.co` and `https://api.trchat.co/api/health`.

## Manual initial deploy

The normal initial deploy is a merge to `main` after bootstrap and certificate issuance. If you need to deploy manually, log in to GHCR on the VPS and run:

```bash
cd /opt/trchat
API_IMAGE=ghcr.io/bhanu8047/vector-graph-api:<git-sha> \
WEB_IMAGE=ghcr.io/bhanu8047/vector-graph-web:<git-sha> \
./scripts/vps/deploy.sh
```

## Rollback

The deploy script preserves the previous image tags in `/opt/trchat/.deploy/previous.env`. Roll back with:

```bash
ssh <VPS_USER>@<VPS_HOST> 'cd /opt/trchat && ./scripts/vps/rollback.sh'
```

## Health checks

- Container health: API `http://127.0.0.1:3001/api/health`, web `http://127.0.0.1:3000/api/health`.
- Public smoke tests: `https://trchat.co` and `https://api.trchat.co/api/health`.

## Immediate SSH incident response

If the VPS already reports hundreds of failed SSH logins, treat that as active internet background scanning and harden it immediately:

1. Confirm key-based SSH access works for your admin user from a second terminal.
2. On the VPS, inspect the current bans and auth failures:

```bash
sudo fail2ban-client status sshd
sudo journalctl -u ssh --since '2 hours ago' || sudo journalctl -u sshd --since '2 hours ago'
```

3. If password auth is still enabled, disable it and validate the config before restart:

```bash
sudo install -d -m 0755 /etc/ssh/sshd_config.d
sudo tee /etc/ssh/sshd_config.d/99-trchat-hardening.conf >/dev/null <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 30s
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
EOF
sudo sshd -t && sudo systemctl restart ssh || sudo sshd -t && sudo systemctl restart sshd
```

4. If you want to move SSH to a different port, add `Port <new-port>` to the same file, open that port in the firewall first, then restart SSH.
5. Rotate any weak or reused passwords and review `~/.ssh/authorized_keys` for stale keys.
6. Keep `fail2ban` enabled and verify the jail is attached to the active SSH port.

## Residual risks and recommended hardening

- Add database backups and restore drills before handling important production data.
- Consider pinning MongoDB/Redis patch digests after the first stable production rollout.
- Rotate `VPS_SSH_KEY` and GitHub OAuth credentials regularly.
- Add external uptime monitoring for both public domains.
- Review application-specific rate limiting and request size limits for the API.
