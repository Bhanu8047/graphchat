import Link from 'next/link';
import { Badge } from '../../components/atoms/Badge';
import { buttonStyles } from '../../components/atoms/buttonStyles';
import { Surface } from '../../components/atoms/Surface';
import {
  ArrowRightIcon,
  GraphIcon,
  SearchIcon,
  ShieldIcon,
  ZapIcon,
} from '../../components/atoms/Icon';
import { MarketingShell } from '../../components/templates/MarketingShell';
import { cn } from '../../lib/ui';

export const metadata = {
  title: 'Docs — trchat',
  description:
    'Full documentation for the trchat CLI tool (gph), REST API, authentication, and deployment.',
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-xl bg-[var(--surface-muted)] px-4 py-3 font-mono text-xs leading-6 text-[var(--foreground)]">
      {children}
    </pre>
  );
}

function Pill({ children }: { children: string }) {
  return (
    <code className="rounded-md bg-[var(--surface-muted)] px-1.5 py-0.5 font-mono text-xs text-[var(--foreground)]">
      {children}
    </code>
  );
}

function SectionAnchor({ id }: { id: string }) {
  return <span id={id} className="-mt-24 block pt-24" />;
}

const cliCommands = [
  {
    cmd: 'gph login',
    flags: ['--key <api_key>', '--server <url>'],
    description:
      'Authenticate the CLI with your trchat server using an API key (prefix sk-trchat-). Exchanges the key for a JWT access + refresh token pair stored locally. The token is auto-refreshed before expiry.',
    example:
      'gph login --key sk-trchat-abc123\ngph login --key sk-trchat-abc123 --server https://your.trchat.host',
  },
  {
    cmd: 'gph logout',
    flags: [],
    description:
      'Revokes the stored refresh token on the server and removes local credentials. After logout, any cached access token is also invalidated.',
    example: 'gph logout',
  },
  {
    cmd: 'gph status',
    flags: ['--json'],
    description:
      'Shows the currently authenticated user, server URL, and token expiry. Use --json for machine-readable output.',
    example: 'gph status\ngph status --json',
  },
  {
    cmd: 'gph repos',
    flags: ['--json'],
    description:
      'Lists all repositories accessible to the current user. Returns repo ID, name, branch, last sync time, and node count.',
    example: 'gph repos\ngph repos --json',
  },
  {
    cmd: 'gph index <path>',
    flags: ['--repo <id>', '--branch <name>'],
    description:
      'Indexes a local repository path and pushes it to the graph service. The path is resolved to an absolute path; only files within it are included. Reuses prior state so only changed files are re-processed.',
    example:
      'gph index ./src --repo my-api-id\ngph index . --repo backend --branch main',
  },
  {
    cmd: 'gph search <query>',
    flags: [
      '--repo <id>',
      '--budget <tokens>',
      '--confidence <level>',
      '--json',
      '--agent',
    ],
    description:
      'Vector + graph search across indexed repos. The --budget flag caps the token count of returned results, dropping lower-confidence nodes first. --agent emits a compact format ready to paste into an AI chat prompt. --confidence accepts EXTRACTED | INFERRED | SPECULATIVE.',
    example:
      'gph search "authentication middleware" --budget 1500\ngph search "JWT guard" --repo backend --confidence EXTRACTED --agent',
  },
  {
    cmd: 'gph path <source> <target>',
    flags: ['--repo <id>'],
    description:
      'Finds the shortest path between two named symbols in the graph and prints every hop. Useful for understanding how middleware or dependency chains connect.',
    example:
      'gph path AuthService JwtGuard --repo my-api-id\ngph path ResponseInterceptor DatabaseService --repo backend',
  },
  {
    cmd: 'gph report',
    flags: ['--repo <id>', '--out <file>'],
    description:
      'Generates a GRAPH_REPORT.md audit report summarising god nodes, top communities, surprise edges, and file coverage stats. Ready to paste into a PR description or agent prompt.',
    example:
      'gph report --repo my-api-id --out GRAPH_REPORT.md\ngph report --repo backend --out ./reports/backend.md',
  },
  {
    cmd: 'gph export',
    flags: ['--repo <id>', '--out <file>'],
    description:
      'Exports a full agent context payload for a named repo as a structured JSON bundle. The bundle includes graph metadata, communities, nodes, and edges — ready to feed into any LLM session.',
    example:
      'gph export --repo my-api-id --out context.json\ngph export --repo backend --out ./context/backend.json',
  },
] as const;

const apiSections = [
  {
    title: 'Authentication',
    badge: 'POST / GET',
    routes: [
      {
        method: 'POST',
        path: '/api/auth/register',
        auth: false,
        description:
          'Create a new user account. Returns access + refresh tokens.',
        body: '{ "email": "you@example.com", "password": "..." }',
      },
      {
        method: 'POST',
        path: '/api/auth/login',
        auth: false,
        description:
          'Authenticate with email + password. Returns access + refresh tokens.',
        body: '{ "email": "you@example.com", "password": "..." }',
      },
      {
        method: 'POST',
        path: '/api/auth/github',
        auth: false,
        description: 'Sign in via GitHub OAuth. Supply the GitHub OAuth code.',
        body: '{ "code": "<oauth_code>" }',
      },
      {
        method: 'GET',
        path: '/api/auth/session',
        auth: true,
        description:
          'Returns the current authenticated user (name, email, role).',
        body: null,
      },
      {
        method: 'POST',
        path: '/api/auth/logout',
        auth: false,
        description:
          'Revokes a refresh token. Supply the refresh token in the body.',
        body: '{ "refresh_token": "..." }',
      },
    ],
  },
  {
    title: 'API Keys (CLI auth)',
    badge: 'POST / GET / DELETE',
    routes: [
      {
        method: 'POST',
        path: '/api/auth/keys',
        auth: true,
        description:
          'Mint a new API key for the current user. The plaintext (sk-trchat-…) is returned once and never stored.',
        body: '{ "label": "my-ci-key", "scopes": ["search", "export"] }',
      },
      {
        method: 'GET',
        path: '/api/auth/keys',
        auth: true,
        description:
          'List all API keys belonging to the current user (IDs, labels, scopes, created date).',
        body: null,
      },
      {
        method: 'DELETE',
        path: '/api/auth/keys/:id',
        auth: true,
        description:
          'Permanently revoke an API key by its ID. Returns 204 on success.',
        body: null,
      },
      {
        method: 'POST',
        path: '/api/auth/exchange',
        auth: false,
        description:
          'Trade an API key for a fresh JWT access + refresh token pair. This is what gph login calls internally.',
        body: '{ "api_key": "sk-trchat-..." }',
      },
      {
        method: 'POST',
        path: '/api/auth/refresh',
        auth: false,
        description:
          'Trade a refresh token for a new access token. The CLI calls this automatically before expiry.',
        body: '{ "refresh_token": "..." }',
      },
    ],
  },
  {
    title: 'Repositories',
    badge: 'GET / POST / DELETE',
    routes: [
      {
        method: 'GET',
        path: '/api/repos',
        auth: true,
        description:
          'List all repos for the current user with metadata (branch, node count, last sync).',
        body: null,
      },
      {
        method: 'GET',
        path: '/api/repos/:id',
        auth: true,
        description: 'Get a single repo by ID including full graph metadata.',
        body: null,
      },
      {
        method: 'POST',
        path: '/api/repos',
        auth: true,
        description:
          'Create / register a new repo. Supply name, remote URL, and branch.',
        body: '{ "name": "my-api", "url": "https://github.com/org/repo", "branch": "main" }',
      },
      {
        method: 'POST',
        path: '/api/repos/import/github/branches',
        auth: true,
        description:
          'List available branches for a GitHub repo before importing.',
        body: '{ "repoUrl": "https://github.com/org/repo" }',
      },
      {
        method: 'POST',
        path: '/api/repos/import/github',
        auth: true,
        description:
          'Import a GitHub repository and trigger initial graph ingestion.',
        body: '{ "repoUrl": "https://github.com/org/repo", "branch": "main" }',
      },
      {
        method: 'POST',
        path: '/api/repos/:id/sync/github',
        auth: true,
        description:
          'Trigger an incremental re-sync for a repo — only changed files are re-processed.',
        body: null,
      },
      {
        method: 'DELETE',
        path: '/api/repos/:id',
        auth: true,
        description: 'Delete a repo and all associated graph data.',
        body: null,
      },
    ],
  },
  {
    title: 'Graph & Search',
    badge: 'GET / POST',
    routes: [
      {
        method: 'POST',
        path: '/api/nodes/search',
        auth: true,
        description:
          'Vector + graph search. Supply query, optional repoId, budget (token cap), and confidence filter.',
        body: '{ "query": "auth middleware", "repoId": "...", "budget": 1500, "confidence": "EXTRACTED" }',
      },
      {
        method: 'GET',
        path: '/api/graph/path',
        auth: true,
        description:
          'Shortest path between two node labels. Returns ordered hop array.',
        body: '?repoId=...&source=AuthService&target=JwtGuard',
      },
      {
        method: 'GET',
        path: '/api/graph/communities/:repoId',
        auth: true,
        description:
          'Returns all Leiden communities for a repo with member counts and top nodes.',
        body: null,
      },
      {
        method: 'GET',
        path: '/api/graph/community/:communityId/prompt',
        auth: true,
        description:
          'Returns a token-bounded, agent-ready context bundle for a single community (cached in Redis).',
        body: null,
      },
      {
        method: 'GET',
        path: '/api/graph/report/:repoId',
        auth: true,
        description:
          'Returns the GRAPH_REPORT.md content as a string — god nodes, surprise edges, coverage stats.',
        body: null,
      },
      {
        method: 'POST',
        path: '/api/graph/analyze',
        auth: true,
        description:
          'Run graph analysis (community detection, god-node scoring) on an already-ingested repo.',
        body: '{ "repoId": "..." }',
      },
    ],
  },
  {
    title: 'System',
    badge: 'GET',
    routes: [
      {
        method: 'GET',
        path: '/api/health',
        auth: false,
        description:
          'Returns service health, Redis cache hit rate, and DB status.',
        body: null,
      },
      {
        method: 'GET',
        path: '/api/health/config',
        auth: false,
        description:
          'Returns non-sensitive runtime configuration (model, chunk size, rate-limit defaults).',
        body: null,
      },
    ],
  },
] as const;

export default function DocsPage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(42rem 22rem at 10% 0%, color-mix(in oklab, var(--color-space-indigo-200) 55%, transparent), transparent 60%), radial-gradient(36rem 18rem at 90% 10%, color-mix(in oklab, var(--color-rosy-taupe-300) 55%, transparent), transparent 60%)',
          }}
        />
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <Badge tone="primary">Documentation</Badge>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-medium leading-tight tracking-tight text-[var(--foreground)] sm:text-5xl">
            Build repository graphs once, query them with precision.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted-foreground)] sm:text-lg">
            Complete reference for the{' '}
            <strong className="font-semibold text-[var(--foreground)]">
              gph CLI
            </strong>
            , the{' '}
            <strong className="font-semibold text-[var(--foreground)]">
              REST API
            </strong>
            , authentication flows, and deployment guidance.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="#quickstart"
              className={buttonStyles({ tone: 'primary', size: 'lg' })}
            >
              Quickstart
            </Link>
            <Link
              href="#cli"
              className={buttonStyles({ tone: 'secondary', size: 'lg' })}
            >
              CLI reference
            </Link>
            <Link
              href="#api"
              className={buttonStyles({ tone: 'secondary', size: 'lg' })}
            >
              API reference
            </Link>
          </div>
        </div>
      </section>

      {/* Nav pills */}
      <div className="sticky top-16 z-30 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--background)_90%,transparent)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
          {[
            'Quickstart',
            'Installation',
            'Authentication',
            'CLI',
            'API',
            'Deployment',
          ].map((label) => (
            <Link
              key={label}
              href={`#${label.toLowerCase()}`}
              className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-[var(--muted-foreground)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[220px_1fr]">
          {/* Sidebar TOC — hidden on mobile */}
          <aside className="hidden lg:block">
            <div className="sticky top-32 space-y-6">
              {[
                { label: 'Quickstart', id: 'quickstart' },
                { label: 'Installation', id: 'installation' },
                { label: 'Authentication', id: 'authentication' },
                {
                  label: 'CLI reference',
                  id: 'cli',
                  children: [
                    { label: 'gph login', id: 'cli-login' },
                    { label: 'gph search', id: 'cli-search' },
                    { label: 'gph query', id: 'cli-query' },
                    { label: 'gph path', id: 'cli-path' },
                    { label: 'gph explain', id: 'cli-explain' },
                    { label: 'gph export', id: 'cli-export' },
                    { label: 'All commands', id: 'cli-all' },
                  ],
                },
                { label: 'API reference', id: 'api' },
                { label: 'Deployment', id: 'deployment' },
              ].map((item) => (
                <div key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="block text-sm font-medium text-[var(--foreground)] hover:text-[var(--primary)]"
                  >
                    {item.label}
                  </a>
                  {'children' in item && item.children ? (
                    <ul className="mt-1.5 space-y-1 border-l border-[var(--border)] pl-3">
                      {item.children.map((child) => (
                        <li key={child.id}>
                          <a
                            href={`#${child.id}`}
                            className="block text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          >
                            {child.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </aside>

          {/* Main content */}
          <div className="min-w-0 space-y-16">
            {/* ── QUICKSTART ─────────────────────────────────────────── */}
            <section>
              <SectionAnchor id="quickstart" />
              <div className="flex items-center gap-3">
                <SearchIcon className="h-5 w-5 text-[var(--primary)]" />
                <h2 className="font-display text-2xl font-semibold text-[var(--foreground)]">
                  Quickstart
                </h2>
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
                From zero to querying your first graph in under three minutes.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  {
                    step: '1',
                    title: 'Create an account',
                    body: 'Sign up at /auth/sign-up or use GitHub OAuth. You can also use the CLI immediately if you already have a server URL and API key.',
                  },
                  {
                    step: '2',
                    title: 'Index a repository',
                    body: 'Generate an API key in the dashboard, run gph login, then gph index ./your-repo --repo <id>. Only changed files are processed on subsequent runs.',
                  },
                  {
                    step: '3',
                    title: 'Query & export',
                    body: 'Run gph search "your question" or gph query "natural language question" to retrieve token-bounded context. Use gph export to generate an agent-ready JSON bundle.',
                  },
                ].map(({ step, title, body }) => (
                  <Surface key={step} tone="elevated" padding="lg">
                    <div className="text-sm font-medium text-[var(--primary)]">
                      Step {step}
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-[var(--foreground)]">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                      {body}
                    </p>
                  </Surface>
                ))}
              </div>
            </section>

            {/* ── INSTALLATION ───────────────────────────────────────── */}
            <section>
              <SectionAnchor id="installation" />
              <div className="flex items-center gap-3">
                <ZapIcon className="h-5 w-5 text-[var(--primary)]" />
                <h2 className="font-display text-2xl font-semibold text-[var(--foreground)]">
                  Installation
                </h2>
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
                The <Pill>gph</Pill> CLI is a Node.js package. Install it
                globally or use it via <Pill>npx</Pill>.
              </p>
              <CodeBlock>
                {
                  '# Global install (beta)\nnpm install -g @trchat/gph@beta\n\n# Or run without installing\nnpx -p @trchat/gph@beta gph login --key sk-trchat-...'
                }
              </CodeBlock>
              <p className="mt-4 text-sm leading-7 text-[var(--muted-foreground)]">
                Requires Node.js 18 or later. The CLI stores credentials in{' '}
                <Pill>~/.trchat/credentials.json</Pill> and configuration in{' '}
                <Pill>~/.trchat/config.json</Pill>.
              </p>
            </section>

            {/* ── AUTHENTICATION ─────────────────────────────────────── */}
            <section>
              <SectionAnchor id="authentication" />
              <div className="flex items-center gap-3">
                <ShieldIcon className="h-5 w-5 text-[var(--primary)]" />
                <h2 className="font-display text-2xl font-semibold text-[var(--foreground)]">
                  Authentication
                </h2>
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
                trchat uses two separate auth flows:
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Surface padding="lg">
                  <h3 className="font-semibold text-[var(--foreground)]">
                    Web / browser
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                    Email + password or GitHub OAuth. Sessions are maintained
                    via HTTP-only cookies. The dashboard and graph UI use this
                    flow.
                  </p>
                </Surface>
                <Surface padding="lg">
                  <h3 className="font-semibold text-[var(--foreground)]">
                    CLI / API key
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                    Generate an API key (<Pill>sk-trchat-…</Pill>) in the
                    dashboard under Settings → API Keys. Run{' '}
                    <Pill>gph login --key sk-trchat-…</Pill>. The CLI exchanges
                    the key for a short-lived JWT access token and a refresh
                    token that auto-renews it.
                  </p>
                </Surface>
              </div>
              <h3 className="mt-6 font-semibold text-[var(--foreground)]">
                API key exchange flow
              </h3>
              <CodeBlock>
                {
                  '# 1. Mint a key in the dashboard, then:\ngph login --key sk-trchat-abc123\n\n# Internally this calls:\n# POST /api/auth/exchange { "api_key": "sk-trchat-abc123" }\n# → { access_token, refresh_token, expires_in }\n\n# All subsequent gph commands attach:\n# Authorization: Bearer <access_token>'
                }
              </CodeBlock>
              <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
                Access tokens expire after a short window; the CLI automatically
                calls <Pill>POST /api/auth/refresh</Pill> before any request
                when expiry is imminent. To log out and revoke the refresh
                token:
              </p>
              <CodeBlock>{'gph logout'}</CodeBlock>
            </section>

            {/* ── CLI REFERENCE ──────────────────────────────────────── */}
            <section>
              <SectionAnchor id="cli" />
              <div className="flex items-center gap-3">
                <ZapIcon className="h-5 w-5 text-[var(--primary)]" />
                <h2 className="font-display text-2xl font-semibold text-[var(--foreground)]">
                  CLI Reference
                </h2>
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
                Every <Pill>gph</Pill> command authenticates via the stored JWT
                and hits the configured server URL. Global help:{' '}
                <Pill>gph --help</Pill>. Per-command help:{' '}
                <Pill>gph &lt;cmd&gt; --help</Pill>.
              </p>

              <div className="mt-8 space-y-8">
                {cliCommands.map((cmd) => (
                  <div
                    key={cmd.cmd}
                    id={`cli-${cmd.cmd.split(' ')[1]}`}
                    className="rounded-2xl border border-[var(--border)] p-5"
                  >
                    <div className="flex flex-wrap items-start gap-2">
                      <code className="rounded-lg bg-[var(--surface-muted)] px-3 py-1 font-mono text-sm font-semibold text-[var(--foreground)]">
                        {cmd.cmd}
                      </code>
                      {cmd.flags.map((f) => (
                        <code
                          key={f}
                          className="rounded-md bg-[var(--surface)] px-2 py-0.5 font-mono text-xs text-[var(--muted-foreground)]"
                        >
                          {f}
                        </code>
                      ))}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                      {cmd.description}
                    </p>
                    <CodeBlock>{cmd.example}</CodeBlock>
                  </div>
                ))}
              </div>
            </section>

            {/* ── API REFERENCE ──────────────────────────────────────── */}
            <section>
              <SectionAnchor id="api" />
              <div className="flex items-center gap-3">
                <GraphIcon className="h-5 w-5 text-[var(--primary)]" />
                <h2 className="font-display text-2xl font-semibold text-[var(--foreground)]">
                  API Reference
                </h2>
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
                All API routes are prefixed with <Pill>/api</Pill>.
                Authenticated routes require an{' '}
                <Pill>Authorization: Bearer &lt;access_token&gt;</Pill> header.
                Responses are JSON. Rate limiting is enforced per user via a
                Redis sliding-window counter.
              </p>

              <div className="mt-8 space-y-10">
                {apiSections.map((section) => (
                  <div key={section.title}>
                    <div className="flex items-center gap-3">
                      <h3 className="font-display text-lg font-semibold text-[var(--foreground)]">
                        {section.title}
                      </h3>
                      <Badge>{section.badge}</Badge>
                    </div>
                    <div className="mt-4 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
                      {section.routes.map((route) => (
                        <div
                          key={`${route.method} ${route.path}`}
                          className="px-5 py-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                'rounded-md px-2 py-0.5 font-mono text-xs font-semibold uppercase',
                                route.method === 'GET'
                                  ? 'bg-[color-mix(in_oklab,var(--color-space-indigo-400)_15%,transparent)] text-[var(--color-space-indigo-600)]'
                                  : route.method === 'POST'
                                    ? 'bg-[color-mix(in_oklab,var(--success)_15%,transparent)] text-[var(--success)]'
                                    : route.method === 'DELETE'
                                      ? 'bg-[color-mix(in_oklab,var(--destructive)_12%,transparent)] text-[var(--destructive)]'
                                      : 'bg-[var(--surface-muted)] text-[var(--muted-foreground)]',
                              )}
                            >
                              {route.method}
                            </span>
                            <code className="font-mono text-sm text-[var(--foreground)]">
                              {route.path}
                            </code>
                            {route.auth ? (
                              <span className="ml-auto rounded-full border border-[var(--border)] px-2 py-0.5 text-[0.65rem] font-medium text-[var(--muted-foreground)]">
                                auth required
                              </span>
                            ) : (
                              <span className="ml-auto rounded-full border border-[var(--border)] px-2 py-0.5 text-[0.65rem] font-medium text-[var(--success)]">
                                public
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                            {route.description}
                          </p>
                          {route.body ? (
                            <pre className="mt-2 overflow-x-auto rounded-lg bg-[var(--surface-muted)] px-3 py-2 font-mono text-[0.7rem] leading-5 text-[var(--foreground)]">
                              {route.body}
                            </pre>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── DEPLOYMENT ─────────────────────────────────────────── */}
            <section>
              <SectionAnchor id="deployment" />
              <div className="flex items-center gap-3">
                <GraphIcon className="h-5 w-5 text-[var(--primary)]" />
                <h2 className="font-display text-2xl font-semibold text-[var(--foreground)]">
                  Deployment
                </h2>
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
                trchat is an Nx monorepo with three deployable apps: the Next.js
                web frontend, the NestJS API, and the Python graph service. Run
                them together via Docker Compose or deploy each independently.
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
                <span className="font-semibold text-[var(--foreground)]">
                  Heads up:
                </span>{' '}
                the repository will be open-sourced soon, so you&apos;ll be able
                to clone, audit, and self-host the entire stack.
              </p>
              <div className="mt-5 space-y-4">
                {[
                  {
                    title: 'Run through Nx (development)',
                    body: 'Use pnpm nx serve web, pnpm nx serve api to start apps locally. Nx caches build artifacts so cold starts after the first run are fast.',
                    code: 'pnpm nx serve web\npnpm nx serve api',
                  },
                  {
                    title: 'Docker Compose (production)',
                    body: 'The repository root contains a docker-compose.yml that wires up the web app, API, graph service, Postgres, and Redis together.',
                    code: 'docker compose up --build',
                  },
                  {
                    title: 'Environment variables',
                    body: 'Copy .env.example to .env and set DATABASE_URL, REDIS_URL, JWT_SECRET (use a long random string in production), GITHUB_CLIENT_ID, and GITHUB_CLIENT_SECRET.',
                    code: 'cp .env.example .env\n# Edit .env with your secrets',
                  },
                  {
                    title: 'Point the CLI at your server',
                    body: 'By default the CLI targets the hosted trchat server. To use a self-hosted instance, pass --server on login or set serverUrl in ~/.trchat/config.json.',
                    code: 'gph login --key sk-trchat-... --server https://your.host.com',
                  },
                ].map(({ title, body, code }) => (
                  <Surface key={title} padding="lg">
                    <h3 className="font-semibold text-[var(--foreground)]">
                      {title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                      {body}
                    </p>
                    <CodeBlock>{code}</CodeBlock>
                  </Surface>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="gradient-cta overflow-hidden rounded-[var(--radius-card)] p-10 text-center text-white sm:p-16">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-medium tracking-tight text-balance sm:text-4xl">
            Ready to give your agents structured context?
          </h2>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/auth/sign-up"
              className={cn(
                buttonStyles({ tone: 'secondary', size: 'lg' }),
                'border-white/20 bg-white/10 text-white hover:border-white/40 hover:bg-white/20',
              )}
            >
              Create account
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link
              href="/capabilities"
              className={cn(
                buttonStyles({ tone: 'ghost', size: 'lg' }),
                'text-white/80 hover:bg-white/10 hover:text-white',
              )}
            >
              View capabilities
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
