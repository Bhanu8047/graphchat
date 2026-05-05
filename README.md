<div align="center">

# graphchat

**Repository context graphs for AI agents — code search that understands structure, not just text.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with Nx](https://img.shields.io/badge/Built%20with-Nx-143055)](https://nx.dev)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![NestJS 11](https://img.shields.io/badge/NestJS-11-E0234E)](https://nestjs.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python%203.11-009688)](https://fastapi.tiangolo.com)
[![Conventional Commits](https://img.shields.io/badge/Commits-Conventional-fe5196)](https://www.conventionalcommits.org)

[Live](https://graphchat.co) · [API](https://api.graphchat.co) · [CLI on npm](https://www.npmjs.com/package/@graphchat/gph) · [Deployment guide](docs/deployment.md) · [Contributing](CONTRIBUTING.md)

</div>

---

## What is graphchat?

`graphchat` indexes a codebase into a **multi-modal context graph** — a directed graph of files, classes, functions, calls, and imports — augmented with **dense vector embeddings** of every symbol. AI agents and humans then query the graph to retrieve precisely the code that matters for a task, with token budgets, traversal modes, and community summaries instead of dumping raw files into a prompt.

It is built for the workflow of **"give my LLM exactly the code it needs to answer this"** — without the noise of full-file context windows or naive `grep`.

### Why it exists

LLM coding agents collapse on real codebases because their context window is filled with irrelevant text. graphchat solves this with three pillars:

1. **Structural truth from AST** — Tree-sitter extracts every symbol and call edge across 10 languages. No hallucinated imports, no fuzzy matches.
2. **Semantic recall from embeddings** — Voyage / OpenAI / Gemini / Ollama embeddings stored in Redis Stack power sub-100 ms vector search.
3. **Topological reasoning from communities** — Leiden community detection surfaces architectural clusters and "god nodes" so agents can reason about modules, not just files.

---

## Capabilities

- 🔎 **Hybrid retrieval** — KNN vector search seeds graph BFS/DFS expansion, returning a connected subgraph that fits a token budget.
- 🧬 **Multi-language AST extraction** — Python, TypeScript, JavaScript, Go, Rust, Java, C, C++, Ruby, C# via official `tree-sitter` grammars.
- 🧭 **Graph-aware queries** — `bfs`, `dfs`, `knn-expand`, shortest-path-between-symbols, and "what depends on X?" introspection.
- 🪐 **Community detection** — Leiden clustering with multi-trial best-modularity selection identifies architectural modules and surprising cross-module edges.
- 📊 **God-node ranking** — PageRank + degree centrality picks the canonical entry-point of each cluster for use as a representative summary.
- 🤖 **Pluggable LLM + embedding providers** — OpenAI, Anthropic Claude, Google Gemini, Voyage, Ollama (local), OpenRouter. Hot-swappable per request.
- 🧠 **Explain & report generation** — Cluster-level natural-language reports rendered against your chosen LLM.
- 🔐 **Auth + multi-tenant** — GitHub OAuth web login, scoped CLI API keys (`sk-graphchat-…`), per-user repo isolation, per-key rate limiting, request-scoped credentials.
- 🪝 **Watch mode + git hooks** — `gph watch` keeps the graph in sync with local edits; opt-in `pre-commit` hook re-indexes deltas.
- 🛡️ **Hardened production deploy** — nginx default-server `444`, edge host allowlist, CORS allowlist, fail2ban + SSH lockdown, immutable GHCR image deploys.

---

## Architecture

```
┌──────────────────┐      ┌──────────────────┐      ┌─────────────────────┐
│  Next.js 16 web  │      │   gph CLI (Node) │      │  AI agents (any)    │
│  graphchat.co    │      │   sk-graphchat-… │      │  via REST + JWT     │
└────────┬─────────┘      └────────┬─────────┘      └──────────┬──────────┘
         │                         │                            │
         │   HTTPS (cookies)       │   HTTPS (Bearer key)       │
         └────────────┬────────────┴────────────┬───────────────┘
                      │                         │
                      ▼                         ▼
             ┌─────────────────────────────────────────────┐
             │  NestJS 11 API  (api.graphchat.co)          │
             │  • Auth, repos, search, graph, dashboard    │
             │  • Rate limiting, GitHub OAuth, JWT/cookie  │
             │  • AI orchestration (libs/ai)               │
             └────┬─────────────────────────────────┬──────┘
                  │                                 │
                  │  HTTP (private)                 │
                  ▼                                 ▼
       ┌──────────────────────┐           ┌──────────────────────┐
       │  FastAPI graph-svc   │           │  Vector + doc store  │
       │  • tree-sitter AST   │           │  • Redis Stack       │
       │  • NetworkX graph    │           │    (HNSW vectors)    │
       │  • Leiden clustering │           │  • MongoDB 7         │
       │  • BFS/DFS/KNN exp.  │           │    (graph + meta)    │
       └──────────────────────┘           └──────────────────────┘
```

- **`apps/web`** — Next.js 16 (App Router, React 19, Tailwind 4, Turbopack). Public site, dashboard, settings, repo browser, graph visualisation.
- **`apps/api`** — NestJS 11. REST API, auth, AI orchestration, rate limiting (`@nestjs/throttler`), Helmet, CORS allowlist.
- **`apps/cli`** — `@graphchat/gph` Node CLI built with Commander. Distributed on npm.
- **`graph-service/`** — Python 3.11 FastAPI sidecar. Owns AST extraction, NetworkX graph state, Leiden, traversal. Internal-only — never exposed via nginx.
- **`libs/ai`** — Provider-agnostic LLM + embedding service layer (OpenAI, Anthropic, Gemini, Voyage, Ollama, OpenRouter).
- **`libs/shared-types`** — TS interfaces shared by `web` ⇄ `api` ⇄ `cli`.
- **`libs/vector-client`** — Redis Stack (HNSW) + MongoDB clients with typed wrappers.
- **`docker/`**, **`scripts/vps/`** — Production Docker images, nginx config, VPS bootstrap + deploy + Let's Encrypt automation.

---

## Algorithms & internals

| Stage | Algorithm | Implementation |
| --- | --- | --- |
| Symbol extraction | Tree-sitter concrete syntax → typed nodes/edges | [`graph-service/core/ast_extractor.py`](graph-service/core/ast_extractor.py) |
| Graph construction | Directed multigraph (`calls`, `imports`, `defines`, `inherits`) | [`graph-service/core/graph_builder.py`](graph-service/core/graph_builder.py) |
| Embedding | Provider-pluggable dense vectors (Voyage `voyage-3` default) | [`libs/ai/src/embedding.service.ts`](libs/ai/src/embedding.service.ts) |
| Vector store | Redis Stack `FT.SEARCH` over HNSW index (cosine) | [`libs/vector-client/src/redis.service.ts`](libs/vector-client/src/redis.service.ts) |
| Community detection | Leiden (multi-trial, best-modularity, seeded) via `graspologic` | [`graph-service/core/leiden_clusterer.py`](graph-service/core/leiden_clusterer.py) |
| God-node ranking | PageRank + weighted degree centrality | [`graph-service/core/graph_builder.py`](graph-service/core/graph_builder.py) |
| Retrieval | KNN seed → BFS/DFS expansion under char budget | [`graph-service/core/query_engine.py`](graph-service/core/query_engine.py) |
| Path reasoning | Dijkstra shortest path on inverse-confidence weights | [`graph-service/core/graph_builder.py`](graph-service/core/graph_builder.py) |
| Cluster reports | LLM-generated natural-language summaries per community | [`graph-service/core/report_generator.py`](graph-service/core/report_generator.py), [`libs/ai/src/explain.service.ts`](libs/ai/src/explain.service.ts) |
| Auth | GitHub OAuth (web) + bcrypt-hashed scoped API keys (CLI) | [`apps/api/src/app/auth`](apps/api/src/app/auth) |
| Rate limiting | Per-key sliding window via `@nestjs/throttler` + Redis | [`apps/api/src/app/rate-limits`](apps/api/src/app/rate-limits) |

> **Privacy:** AST extraction is 100% local to the graph-service container. Source code never leaves your infrastructure unless you opt in to a hosted LLM provider for `explain` / `report`.

---

## Tech stack

**Frontend** — Next.js 16 · React 19 · Tailwind CSS 4 · `tailwind-variants` · `motion` · D3.js · Turbopack
**Backend** — NestJS 11 · Express · Helmet · `@nestjs/throttler` · `class-validator` · `jsonwebtoken` · `cookie-parser`
**CLI** — Node 18+ · Commander · `@graphchat/gph` (npm)
**Graph service** — Python 3.11 · FastAPI · Uvicorn · Tree-sitter (10 grammars) · NetworkX · Graspologic (Leiden) · Pydantic
**Data** — Redis Stack (vector index) · MongoDB 7 (documents + graph metadata)
**AI providers** — OpenAI · Anthropic · Google Gemini · Voyage AI · Ollama · OpenRouter
**Infra** — Docker Compose · nginx · Let's Encrypt (certbot) · GitHub Actions · GHCR · CentOS / Ubuntu
**Tooling** — Nx 22 monorepo · TypeScript 5.9 · ESLint · Prettier · Jest · Husky · Conventional Commits · commitlint

---

## Quick start (local dev)

**Requirements:** Node.js 20+, Python 3.11+, Docker, npm 10+.

```bash
# 1. Clone & install
git clone https://github.com/bhanu8047/graphchat.git graphchat
cd graphchat
npm install

# 2. Bring up Redis Stack, MongoDB, and the FastAPI graph-service
npm run docker

# 3. Configure environment (copy .env.example → .env, fill in provider keys)
cp .env.example .env

# 4. Start API and web in two terminals
npm run start:api      # → http://localhost:3001
npm run start:web      # → http://localhost:3000

# 5. (Optional) Run the CLI against your local API
npx nx run cli:run-cli -- login --key sk-graphchat-…
```

Web app: <http://localhost:3000> · API: <http://localhost:3001/api> · Graph service: <http://localhost:5000> (private)

### Useful commands

```bash
npm run check                 # lint + test + build + typecheck (all projects)
npx nx graph                  # interactive project graph
npx nx affected -t test       # only test what changed since main
npx nx run web:build          # production Next build
npx nx run api:build          # production Nest build
npx nx run cli:build          # build the gph CLI
npm run clean                 # nuke build artifacts + caches
npm run format                # prettier write
```

See [`AGENTS.md`](AGENTS.md) for AI-agent-friendly Nx workflows.

---

## CLI

```bash
npm install -g @graphchat/gph

gph login --key sk-graphchat-…          # auth
gph repos                                # list your repos
gph index ./src --repo my-repo-id        # local AST → server
gph search "auth middleware" --budget 1500
gph path --from auth.guard.ts:JwtGuard --to user.controller.ts:login
gph report --repo my-repo-id             # cluster-level architecture summary
```

Full CLI docs: [`apps/cli/README.md`](apps/cli/README.md).

---

## Documentation

| Topic | Location |
| --- | --- |
| Production VPS deployment (DNS, certs, GHCR, secrets) | [`docs/deployment.md`](docs/deployment.md) |
| CLI usage & reference | [`apps/cli/README.md`](apps/cli/README.md) |
| Dashboard redesign spec | [`docs/dashboard-redesign-prompt.md`](docs/dashboard-redesign-prompt.md) |
| AI implementation prompts (history) | [`docs/ai_prompts/`](docs/ai_prompts) |
| Nx & agent guidelines | [`AGENTS.md`](AGENTS.md), [`CLAUDE.md`](CLAUDE.md) |
| Contribution workflow | [`CONTRIBUTING.md`](CONTRIBUTING.md) |

---

## Deployment

graphchat ships as a Docker Compose stack deployed via GitHub Actions to any Linux VPS (CentOS 9 or Ubuntu 22.04+ supported out of the box).

**TL;DR**

1. Provision a VPS, point DNS for `graphchat.co` + `api.graphchat.co` at it.
2. Add repository secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `PROD_ENV_FILE` (full `.env.prod` contents).
3. Run the **Bootstrap VPS** GitHub Actions workflow once. It installs Docker, hardens SSH, configures `fail2ban`, and seeds `/opt/graphchat`.
4. Run **`scripts/vps/init-letsencrypt.sh`** on the VPS to issue certs for `graphchat.co` + `api.graphchat.co`.
5. Push to `main`. The CI pipeline builds GHCR images tagged with the commit SHA and SSHes in to `docker compose pull && up -d`.

The full guide — including host-allowlist hardening, cookie domain semantics, certificate renewal cron, and rollback procedure — lives in [`docs/deployment.md`](docs/deployment.md).

### Self-hosting in one command

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Contributing

We welcome issues, PRs, language-grammar additions, new LLM providers, and benchmarks. Please read **[CONTRIBUTING.md](CONTRIBUTING.md)** before opening a PR — it covers:

- Project setup, the Nx workflow, and how to run affected tests
- Conventional Commits + commitlint rules (enforced by Husky)
- Coding standards (ESLint, Prettier, TypeScript strictness, Python `ruff`)
- How to add a new tree-sitter language
- How to add a new LLM or embedding provider
- Security disclosure process

By contributing you agree your work is licensed under the [MIT License](LICENSE).

---

## Security

Found a vulnerability? **Do not open a public issue.** Email **security@graphchat.co** with details and reproduction steps. We aim to acknowledge within 48 hours and ship a fix within 7 days for high-severity reports. See [CONTRIBUTING.md § Security](CONTRIBUTING.md#security) for the full policy and out-of-scope items.

The deployed stack ships with: Helmet, strict CORS allowlist, edge host allowlist + nginx `444` default server, bcrypt-hashed API keys, per-key rate limiting, fail2ban SSH jail, and sandboxed repo-path resolution in the graph service. See [`docs/deployment.md § Host and origin hardening`](docs/deployment.md#host-and-origin-hardening).

---

## License

[MIT](LICENSE) © graphchat contributors.

---

<div align="center">

Built with ❤️ on top of [Nx](https://nx.dev), [tree-sitter](https://tree-sitter.github.io), [NetworkX](https://networkx.org), and [Graspologic](https://graspologic-org.github.io/graspologic/).

</div>
