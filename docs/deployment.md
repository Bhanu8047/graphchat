# VPS deployment

This repository deploys production images from GitHub Actions to a Docker Compose stack on a Ubuntu VPS.

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
```

The workflow uses the built-in `GITHUB_TOKEN` for GHCR push/pull during automated deploys. For manual pulls or rollbacks from another shell, log in to GHCR with a read-capable token first if the package is private.

## VPS environment

Create `/opt/trchat/.env.prod` from `.env.prod.example` on the VPS:

```bash
MONGO_ROOT_PASSWORD=replace-with-a-long-random-password
WEB_URL=https://trchat.co
NEXT_PUBLIC_APP_URL=https://trchat.co
NEXT_PUBLIC_API_URL=https://api.trchat.co/api

GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
VOYAGE_BASE_URL=https://api.voyageai.com/v1
```

`MONGO_ROOT_PASSWORD` is used both to initialize MongoDB and to compose the API's private `MONGODB_URI`.

## One-time VPS bootstrap

From your workstation, copy the bootstrap script and run it on a fresh Ubuntu VPS:

```bash
scp scripts/vps/bootstrap-ubuntu.sh <VPS_USER>@<VPS_HOST>:/tmp/bootstrap-ubuntu.sh
ssh <VPS_USER>@<VPS_HOST> 'sudo APP_DIR=/opt/trchat bash /tmp/bootstrap-ubuntu.sh'
```

Log out and back in so Docker group membership applies, then create the deployment directory contents and production env:

```bash
ssh <VPS_USER>@<VPS_HOST> 'mkdir -p /opt/trchat'
scp docker-compose.prod.yml .env.prod.example <VPS_USER>@<VPS_HOST>:/opt/trchat/
scp -r docker scripts <VPS_USER>@<VPS_HOST>:/opt/trchat/
ssh <VPS_USER>@<VPS_HOST> 'cd /opt/trchat && cp .env.prod.example .env.prod && chmod +x scripts/vps/*.sh'
ssh <VPS_USER>@<VPS_HOST> 'nano /opt/trchat/.env.prod'
```

After DNS points at the VPS and port 80 is reachable, issue the first Let's Encrypt certificate:

```bash
ssh <VPS_USER>@<VPS_HOST> 'cd /opt/trchat && EMAIL=admin@trchat.co ./scripts/vps/init-letsencrypt.sh'
```

## Deploy flow

Merging to `main` runs:

1. CI: `npm ci`, `npm run format:check`, `npm exec nx typecheck api`, `npm exec nx build api`, and `npm exec nx build web`.
2. CD: builds and pushes:
   - `ghcr.io/bhanu8047/trchat-api:<git-sha>`
   - `ghcr.io/bhanu8047/trchat-web:<git-sha>`
3. CD uploads the Compose/nginx/scripts bundle to `/opt/trchat`.
4. CD runs `/opt/trchat/scripts/vps/deploy.sh` with exact image tags.
5. CD verifies `https://trchat.co` and `https://api.trchat.co/api/health`.

## Manual initial deploy

The normal initial deploy is a merge to `main` after bootstrap and certificate issuance. If you need to deploy manually, log in to GHCR on the VPS and run:

```bash
cd /opt/trchat
API_IMAGE=ghcr.io/bhanu8047/trchat-api:<git-sha> \
WEB_IMAGE=ghcr.io/bhanu8047/trchat-web:<git-sha> \
./scripts/vps/deploy.sh
```

## Rollback

The deploy script preserves the previous image tags in `/opt/trchat/.deploy/previous.env`. Roll back with:

```bash
ssh <VPS_USER>@<VPS_HOST> 'cd /opt/trchat && ./scripts/vps/rollback.sh'
```

## Health checks

- Container health: API `http://127.0.0.1:3001/api/health`, web `http://127.0.0.1:3000`.
- Public smoke tests: `https://trchat.co` and `https://api.trchat.co/api/health`.

## Residual risks and recommended hardening

- Add database backups and restore drills before handling important production data.
- Consider pinning MongoDB/Redis patch digests after the first stable production rollout.
- Rotate `VPS_SSH_KEY` and GitHub OAuth credentials regularly.
- Add external uptime monitoring for both public domains.
- Review application-specific rate limiting and request size limits for the API.
