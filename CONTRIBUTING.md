# Contributing to graphchat

First — thanks for taking the time to contribute! 🎉

graphchat is an open-source project and we welcome bug reports, feature proposals, documentation fixes, new tree-sitter language grammars, additional LLM/embedding providers, and benchmarks. This document explains how to set up the project, the conventions we follow, and how to get a PR merged smoothly.

> **TL;DR** — Fork → branch off `main` → write code + tests → `npm run check` → conventional-commit message → open a PR with a clear description and screenshots/logs.

---

## Table of contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting set up](#getting-set-up)
3. [Repository layout](#repository-layout)
4. [Daily workflow with Nx](#daily-workflow-with-nx)
5. [Coding standards](#coding-standards)
6. [Commit messages (Conventional Commits)](#commit-messages-conventional-commits)
7. [Branching, PRs, and review](#branching-prs-and-review)
8. [Testing](#testing)
9. [Adding a new tree-sitter language](#adding-a-new-tree-sitter-language)
10. [Adding a new LLM or embedding provider](#adding-a-new-llm-or-embedding-provider)
11. [Documentation contributions](#documentation-contributions)
12. [Releases](#releases)
13. [Security](#security)
14. [Getting help](#getting-help)

---

## Code of Conduct

We follow the [Contributor Covenant 2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). Be kind, assume good intent, and report unacceptable behaviour to **conduct@graphchat.co**. Maintainers may remove comments, commits, code, issues, or PRs that violate the covenant.

---

## Getting set up

### Requirements

- **Node.js** ≥ 20 LTS (tested on 20, 22)
- **npm** ≥ 10 (the workspace uses npm workspaces — pnpm/yarn are not supported in CI)
- **Python** ≥ 3.11 (for the graph-service)
- **Docker** + **Docker Compose** (for Redis Stack, MongoDB, and the graph-service container)
- A POSIX shell (macOS, Linux, or WSL2)

### One-time setup

```bash
git clone https://github.com/<your-fork>/vector-graph.git graphchat
cd graphchat
npm install
cp .env.example .env             # fill in at least one LLM/embedding provider key
npm run docker                   # starts Redis Stack, MongoDB, graph-service
```

Husky installs the pre-commit hook automatically on `npm install`. It runs `lint-staged` (Prettier write) and `commitlint` on every commit.

### Running the apps

| Process | Command | URL |
| --- | --- | --- |
| API (NestJS) | `npm run start:api` | <http://localhost:3001/api> |
| Web (Next.js) | `npm run start:web` | <http://localhost:3000> |
| Graph service | started by `npm run docker` | <http://localhost:5000> (private) |
| CLI (dev) | `npx nx run cli:run-cli -- <command>` | n/a |

---

## Repository layout

```
apps/
  api/            NestJS 11 REST API
  web/            Next.js 16 + React 19 frontend
  cli/            @graphchat/gph — Node CLI (Commander)
graph-service/    Python 3.11 FastAPI sidecar (AST + graph + Leiden)
libs/
  ai/             Pluggable LLM + embedding providers
  shared-types/   TS types shared across apps
  vector-client/  Redis Stack + MongoDB typed clients
docker/           Production Dockerfiles + nginx config
scripts/vps/      VPS bootstrap, deploy, certbot automation
docs/             Deployment guide and design docs
```

---

## Daily workflow with Nx

graphchat is an [Nx](https://nx.dev) monorepo. Always go through Nx — never run underlying tools directly — so caching and the project graph stay correct.

```bash
npx nx graph                         # explore project + task graph
npx nx affected -t test lint build   # only run tasks for changed projects
npx nx run web:build                 # build a single project
npx nx run-many -t test              # run a target across all projects
npm run check                        # lint + test + build + typecheck (CI parity)
npm run clean                        # delete dist/, .next/, out-tsc/, .nx/cache
```

> **Tip for AI-agent contributors:** read [`AGENTS.md`](AGENTS.md) — it contains the canonical patterns for invoking Nx targets and discovering generators.

---

## Coding standards

### TypeScript / JavaScript

- **TypeScript strict mode** is on workspace-wide. No `any` unless justified with a comment.
- **ESLint** is enforced in CI (`npx nx run-many -t lint`). Configuration lives in [`eslint.config.mjs`](eslint.config.mjs) and per-project overrides.
- **Prettier** formats all source. Run `npm run format` before pushing if you skipped the hook.
- Prefer **named exports** over default exports.
- Co-locate tests next to source as `*.spec.ts` / `*.test.ts`.
- React components use **function components + hooks**, Tailwind 4 utility classes, and `tailwind-variants` for variants. No CSS-in-JS.
- API endpoints use NestJS DTOs with `class-validator`. Always validate at the boundary.

### Python (graph-service)

- Python 3.11+, type-annotated, `from __future__ import annotations` at top of new modules.
- Format with `black` and lint with `ruff` (config in `graph-service/pyproject.toml` if present, else default rules).
- Pure functions where possible; the FastAPI layer in `main.py` should stay thin.
- Never call out to the network from `core/*` modules — they must stay local-only for privacy guarantees.

### General

- **No new top-level dependencies** without discussion in an issue first. Keep the dependency graph small.
- **No new files for one-off helpers.** Prefer extending an existing module.
- **No comments that just restate the code.** Explain *why*, not *what*.
- **Security:** sanitize all path inputs (see `_safe_repo_path` in `graph-service/main.py`), parameterise all DB queries, never log secrets, never echo back raw error messages from upstream providers.

---

## Commit messages (Conventional Commits)

We use **[Conventional Commits](https://www.conventionalcommits.org)** enforced by `@commitlint/config-conventional`. The Husky `commit-msg` hook will reject non-conforming messages.

Format:

```
<type>(<scope>): <short summary>

<optional body>

<optional footer(s)>
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

Suggested scopes: `web`, `api`, `cli`, `graph-service`, `ai`, `shared-types`, `vector-client`, `infra`, `repo`.

Examples:

```
feat(api): add /repos/:id/communities endpoint
fix(web): preserve query params through GitHub OAuth redirect
docs(deployment): clarify cookie-domain requirement for cross-subdomain auth
chore(repo): rebrand repo with graphchat
```

Breaking changes use `!` and a `BREAKING CHANGE:` footer:

```
refactor(api)!: rename /search endpoint to /retrieve

BREAKING CHANGE: clients must update to the /retrieve route. Old /search returns 410 for one minor cycle.
```

---

## Branching, PRs, and review

1. **Fork** the repo and create a branch off `main`. Branch names: `feat/short-description`, `fix/short-description`, `docs/...`.
2. Keep PRs **focused and small**. One logical change per PR. Split refactors from feature work.
3. **Before opening a PR**, run:
   ```bash
   npx nx affected -t lint test build typecheck
   ```
4. Open the PR against `main`. Fill in the PR template (what / why / how to test / screenshots for UI changes).
5. Link any related issues with `Closes #123`.
6. CI must be green. PRs that touch deployment config should also include a manual smoke-test note.
7. At least **one maintainer approval** is required to merge. Maintainers may push small fixups (formatting, lint) directly.
8. We **squash-merge** by default; the PR title becomes the squash commit message, so make it conventional-commit shaped.

### What makes a PR easy to review

- A clear description with the *problem* before the *solution*.
- Screenshots or short clips for UI changes.
- For new endpoints: a `curl` invocation + expected response in the PR body.
- For perf changes: before/after numbers.
- Tests that fail without your fix and pass with it.

---

## Testing

| Layer | Framework | Command |
| --- | --- | --- |
| API unit | Jest + `@nestjs/testing` | `npx nx test api` |
| Web unit | Jest + jsdom + Testing Library | `npx nx test web` |
| Libs | Jest | `npx nx run-many -t test -p ai shared-types vector-client` |
| Graph service | `pytest` | `cd graph-service && pytest` |
| Affected only | Nx | `npx nx affected -t test` |

We don't currently ship E2E tests; contributions adding Playwright coverage to the web app are welcome.

---

## Adding a new tree-sitter language

1. Add the npm package for the grammar to `graph-service/requirements.txt` (e.g. `tree-sitter-kotlin`).
2. Register the extension(s) and `Language` in `LANG_MAP` in [`graph-service/core/ast_extractor.py`](graph-service/core/ast_extractor.py).
3. Add `(node-type → graphchat-node-kind)` mappings in the same file's extraction visitor.
4. Add a fixture file under `graph-service/tests/fixtures/<lang>/` and a test that asserts the expected nodes/edges are extracted.
5. Document the new language in this README's *Capabilities* section.

---

## Adding a new LLM or embedding provider

Providers live in [`libs/ai/src/providers/`](libs/ai/src/providers).

1. Create `libs/ai/src/providers/<name>.{llm,embed}.ts` implementing the `LlmProvider` or `EmbeddingProvider` interface from [`libs/ai/src/types.ts`](libs/ai/src/types.ts).
2. Register it in [`libs/ai/src/llm.service.ts`](libs/ai/src/llm.service.ts) or [`libs/ai/src/embedding.service.ts`](libs/ai/src/embedding.service.ts).
3. Read API keys via `ConfigService` only — **never hardcode** or log them.
4. Add a unit test with a mocked HTTP client.
5. Document the new env vars in `README.md` and `docs/deployment.md`.

---

## Documentation contributions

Docs live in `docs/` and `README.md`. Style: short sentences, code blocks for every command, link to source files with workspace-relative paths. Use `npx nx graph` screenshots sparingly.

---

## Releases

- Versioning follows [SemVer](https://semver.org).
- The CLI is published from CI on tagged commits via `nx release`. See [`apps/cli/CHANGELOG.md`](apps/cli/CHANGELOG.md).
- The web + api are continuously deployed from `main` via GitHub Actions to GHCR → VPS. There are no per-release tags for the apps.

---

## Security

**Please do not open public issues for security vulnerabilities.**

Email **security@graphchat.co** with:

- A description of the issue and impact
- Reproduction steps or a PoC
- Affected versions / commits
- Your preferred name + handle for the credit (or "anonymous")

We aim to:

- Acknowledge reports within **48 hours**
- Provide a remediation plan within **7 days** for high-severity issues
- Coordinate public disclosure with the reporter

**In scope:** code in this repo, deployed `graphchat.co` and `api.graphchat.co`, the published `@graphchat/gph` npm package.

**Out of scope:** social engineering of maintainers, denial-of-service via volumetric traffic, vulnerabilities in third-party dependencies (please report upstream and we will track), missing best-practice headers without demonstrable impact.

---

## Getting help

- **Questions / discussion** — open a GitHub Discussion (preferred) or issue tagged `question`.
- **Bugs** — open an issue using the *Bug report* template; include OS, Node version, and reproduction steps.
- **Feature requests** — open an issue using the *Feature request* template; explain the use case before the proposed API.

Thanks again — every contribution, big or small, makes graphchat better. 💛
