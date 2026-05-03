# vector-graph

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
