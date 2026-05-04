# vector-graph

Production VPS deployment is documented in [docs/deployment.md](docs/deployment.md).

## CI/CD deployment environment

The deployment workflow publishes immutable Docker images to GHCR and deploys them to `/opt/trchat` on the VPS. Add these repository secrets before merging deployment changes to `main`:

```text
VPS_HOST      # VPS IP address or hostname
VPS_USER      # SSH user that can run Docker in /opt/trchat
VPS_SSH_KEY   # private SSH key for VPS_USER
VPS_PORT      # optional; defaults to 22
PROD_ENV_FILE # full contents of /opt/trchat/.env.prod
```

The workflow uses GitHub's built-in `GITHUB_TOKEN` to push and pull GHCR images, and writes `/opt/trchat/.env.prod` from the `PROD_ENV_FILE` repository secret during deploy. No separate GHCR secret is required for the automated workflow.

Set `PROD_ENV_FILE` to the full production env file contents, for example:

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

Optional provider variables can also be added to `.env.prod` as needed: `VOYAGE_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `OLLAMA_BASE_URL`, `LLM_PROVIDER`, and `EMBEDDING_PROVIDER`.

When the web app and API live on different subdomains in production, set `APP_SESSION_COOKIE_DOMAIN` to the shared parent domain so the browser sends `vectorgraph_session` to both hosts. For the current deployment, use `.trchat.co`. Leave it unset for localhost development.

## GitHub Web Login

The web app can now sign users into GitHub and use that session to import public or private repositories without pasting a Personal Access Token into the form.

Set these variables in the root `.env` before starting the web app:

```bash
GITHUB_CLIENT_ID=your_github_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_client_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

In your GitHub OAuth App settings, use this callback URL:

```text
http://localhost:3000/api/auth/github/callback
```

After that:

```bash
npm run docker
npm run api:dev
npm run web:dev
```

Open the Repositories tab in the web app, click `Sign In with GitHub`, then import any `owner/repo` or full GitHub URL. Private repositories require a GitHub login with repository access.
