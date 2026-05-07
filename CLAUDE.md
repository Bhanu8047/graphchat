<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

## Project Structure

- Monorepo tool: Nx (pnpm workspace)
- API framework: NestJS — `apps/api/src/`
- CLI package — `apps/cli/src/`
- Web app (Next.js) — `apps/web/src/`

## Auth Module

- Controller: `apps/api/src/app/auth/auth.controller.ts`
- Service: `apps/api/src/app/auth/auth.service.ts`
- JWT guard: `apps/api/src/app/common/auth/auth.guard.ts`
- Existing device-flow (gph login): `apps/cli/src/commands/login.ts` (`loginViaWeb()`) + `apps/api/src/app/auth/cli-auth.service.ts`
- GitHub OAuth (web): `apps/web/src/app/api/auth/github/` (login / callback / session / logout routes) + `apps/web/src/lib/github-auth.ts`

## Database

- ORM: Raw MongoDB driver via `MongoDatabaseService` (no Mongoose/Prisma)
- User entity/model: `apps/api/src/app/users/users.repository.ts` (`StoredUser = AppUser & { passwordHash? }`)
- Migrations folder: none — indexes created in `onModuleInit()` per repository
- githubAccessToken field exists: yes — `AppUser.githubAccessToken?: string` in `libs/shared-types/src/index.ts`, stored in DB via `users.update()`

## CLI Architecture

- Entry/command registration: `apps/cli/src/main.ts` (`program.addCommand(...)`)
- API client/http helper: `apps/cli/src/lib/api-client.ts` (`createClient()` — axios with auto-refresh interceptor)
- Config/credentials helper: `apps/cli/src/lib/credentials.ts` (`loadCredentials()`, `saveCredentials()`, `deleteCredentials()`)
- Spinner/prompt library in use: `ora` (spinner), `inquirer` (prompts), `chalk` (colors)
- Existing command example to mirror: `apps/cli/src/commands/login.ts`

## API Conventions

- Auth guard decorator: global `AuthGuard` applied by default; use `@Public()` to opt-out (`apps/api/src/app/common/auth/public.decorator.ts`)
- Current user decorator: `@CurrentUser()` → `AuthenticatedUser` (`apps/api/src/app/common/auth/current-user.decorator.ts`)
- Base API URL prefix: `/api` (set via `app.setGlobalPrefix('api')`)
- HttpService or axios pattern: raw `fetch()` / `axios` in services directly (no NestJS HttpModule)

## GitHub CLI Commands (gph github *)

- Parent command: `apps/cli/src/commands/github/index.ts` (`githubCommand()`) — registered in `main.ts`
- `gph github login`: `apps/cli/src/commands/github/login.ts` (`githubLoginCommand()`) — device flow, polls `/api/auth/github/cli/poll`
- `gph github repos`: `apps/cli/src/commands/github/repos.ts` (`githubReposCommand()`) — browse & import GitHub repos
  - Flags: `--search <query>`, `--org <org>`, `--json`
  - Calls `GET /api/auth/github/repos` → inquirer list picker → confirm import → branch picker → `POST /api/repos/import/github`
  - Branch list via `POST /api/repos/import/github/branches` with `{ url: "https://github.com/<full_name>" }`
  - 401 from repos endpoint shows: "run: gph github login" message
- `gph github import [url]`: `apps/cli/src/commands/github/import.ts` (`githubImportCommand()`) — import & auto-select repo
  - Optional `[url]` arg (full URL or `owner/repo`); if omitted shows the same repo picker as `repos`
  - After import calls `setSelectedRepoId()` — no need to run `gph use` separately
  - Success message includes `gph index ./<dirname>` hint
- `gph github sync`: `apps/cli/src/commands/github/sync.ts` (`githubSyncCommand()`) — calls `POST /api/repos/:id/sync/github`; uses `resolveRepoId()` with optional `--repo <id>` flag
- `gph github status`: `apps/cli/src/commands/github/status.ts` (`githubStatusCommand()`) — calls `GET /api/auth/session`, checks `user.githubLogin`; prints connected/not-connected
- `gph github logout`: `apps/cli/src/commands/github/logout.ts` (`githubLogoutCommand()`) — calls `DELETE /auth/github/token`; gracefully handles 404 (endpoint not yet on server) with manual-revoke instructions
- Shared helpers: `apps/cli/src/commands/github/shared.ts` — `fetchGithubRepos`, `pickGithubRepo`, `fetchBranches`, `pickBranch`, `importGithubRepo` — reused by both `repos` and `import` commands
  - `fetchBranches` and `importGithubRepo` handle 401/403 ("not connected") and 404 ("private repo, connect GitHub first") with actionable messages
- `gph github login` pre-checks session expiry before the poll loop (`isTokenExpired`) and registers `process.once('exit')` to stop the spinner if the axios interceptor calls `process.exit` mid-poll

## GitHub CLI Device Flow (gph github login)

- Service: `apps/api/src/app/auth/github-device-flow.service.ts` (`GithubDeviceFlowService`)
- Methods: `startDeviceFlow()`, `pollDeviceFlow(deviceCode, userId)`, `listRepos(userId, opts)`
- Endpoints: `POST /auth/github/cli/start` (public), `POST /auth/github/cli/poll` (authed), `GET /auth/github/repos` (authed)
- Poll DTO: `apps/api/src/app/auth/dto/github-device-flow.dto.ts` (`GithubCliPollDto`)
- On successful poll: saves `githubAccessToken` to user record via `users.update()`
- `GET /auth/github/repos` query params: `search`, `org`, `page` (default 1); throws 401 if no stored token
- GitHub token stored on user: `AppUser.githubAccessToken?: string` (`libs/shared-types/src/index.ts`)
- Config required: `GITHUB_CLIENT_ID` env var (read via `ConfigService.getOrThrow`)

## Key Patterns

- How a new CLI command is registered: export `fooCommand(): Command` from `apps/cli/src/commands/foo.ts`, then `program.addCommand(fooCommand())` in `apps/cli/src/main.ts`
- How CLI calls the API: `const client = createClient(); const { data } = await client.post('/api/some/endpoint', body);`
- How DB is accessed in services: inject repository (`constructor(private readonly usersRepo: UsersRepository)`), call `this.usersRepo.findById(id)`
