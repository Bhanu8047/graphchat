# `@trchat/gph` (beta)

Repository context graph for AI agents. The `gph` CLI authenticates against a
self-hosted or hosted trchat server, indexes local repositories, and exposes
graph + vector search results in formats designed for LLM workflows.

> **Beta status.** This release ships a stable subset of commands. The
> `query`, `explain`, and `watch` commands are not yet wired to the public API
> and are intentionally hidden until the corresponding endpoints land.

## Install

```bash
# Global install (beta)
npm install -g @trchat/gph@beta

# One-off run
npx -p @trchat/gph@beta gph login --key sk-trchat-...
```

Requires Node.js 18 or later.

## Quick start

```bash
# 1. Mint an API key in the dashboard (Settings → API Keys), then:
gph login --key sk-trchat-abc123

# 2. List your repositories
gph repos

# 3. Index a local checkout
gph index ./src --repo my-api-id

# 4. Search across the indexed graph
gph search "authentication middleware" --budget 1500
```

## Commands shipped in beta

| Command | Description |
| --- | --- |
| `gph login` | Exchange an API key for a JWT token pair stored locally. |
| `gph logout` | Revoke the refresh token and remove local credentials. |
| `gph status` | Print the current user, server, and token expiry. |
| `gph repos` | List repositories accessible to the authenticated user. |
| `gph index <path>` | Push a local repository checkout to the graph service. |
| `gph search <query>` | Vector + graph search with token-budget aware filtering. |
| `gph path <a> <b>` | Shortest path between two named symbols. |
| `gph report` | Generate a `GRAPH_REPORT.md` audit document. |
| `gph export` | Export the full agent-context bundle as JSON. |

Run `gph <command> --help` for full flag documentation.

## Storage

| File | Purpose |
| --- | --- |
| `~/.trchat/credentials.json` | Access token, refresh token, expiry, server URL (`0600`). |
| `~/.trchat/config.json` | Persisted CLI configuration (server URL, default repo, etc.). |

Override the server URL per-command with `--server`, or set the
`TRCHAT_SERVER` environment variable.

## Development

```bash
# From the monorepo root
nx build cli      # tsc → apps/cli/dist
nx typecheck cli
nx lint cli
```

Local debug:

```bash
node apps/cli/dist/main.js --help
```

## License

MIT
