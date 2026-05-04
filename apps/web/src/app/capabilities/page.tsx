import Link from 'next/link';
import { Badge } from '../../components/atoms/Badge';
import { buttonStyles } from '../../components/atoms/buttonStyles';
import {
  ArrowRightIcon,
  BoxIcon,
  DatabaseIcon,
  GraphIcon,
  LayersIcon,
  LinkIcon,
  NetworkIcon,
  ShieldIcon,
  ZapIcon,
  ActivityIcon,
  CheckIcon,
} from '../../components/atoms/Icon';
import { CapabilityCard } from '../../components/molecules/CapabilityCard';
import { MarketingShell } from '../../components/templates/MarketingShell';

export const metadata = {
  title: 'Capabilities — trchat',
  description:
    'Deep dive into the extraction pipeline, graph algorithms, edge confidence model, and caching architecture powering trchat.',
};

const capabilities = [
  {
    icon: <LayersIcon className="h-5 w-5" />,
    title: 'Multi-Modal Extraction',
    description:
      'Parses code (.py, .js, .go, .java, …), Markdown, PDFs and images. Tree-sitter extracts ASTs, call graphs and docstrings; LLMs extract concepts from prose; vision models read diagrams.',
    badges: [
      { label: 'tree-sitter', tone: 'indigo' as const },
      { label: 'AST', tone: 'indigo' as const },
      { label: 'vision LLM', tone: 'neutral' as const },
      { label: 'docstrings', tone: 'neutral' as const },
    ],
    detail: (
      <div className="space-y-3">
        <p>
          <strong className="font-semibold text-[var(--foreground)]">
            Tree-sitter AST parsing
          </strong>{' '}
          gives us a deterministic, language-agnostic concrete syntax tree for
          every supported language. We walk the tree to extract function
          definitions, class hierarchies, import statements, and inline call
          graphs — without executing or spawning a language server.
        </p>
        <p>
          For prose files (Markdown, RST, PDF text), an LLM pass identifies key
          concepts, entities, and inter-document references and emits them as
          soft nodes into the graph. Image assets go through a vision model that
          describes diagrams and architecture drawings; those descriptions are
          then chunked and vectorised alongside code.
        </p>
        <ul className="mt-2 space-y-1 pl-4">
          <li className="list-disc">
            Supported grammars: Python, JavaScript/TypeScript, Go, Java, Rust,
            Ruby, C/C++, Kotlin, Swift
          </li>
          <li className="list-disc">
            Incremental re-parse — only files that changed since last sync are
            re-processed
          </li>
          <li className="list-disc">
            Chunk size and overlap are configurable per file type
          </li>
        </ul>
      </div>
    ),
  },
  {
    icon: <NetworkIcon className="h-5 w-5" />,
    title: 'Knowledge Graph Build',
    description:
      'Merges all extracted nodes and edges into a NetworkX graph and applies the Leiden algorithm for semantic community detection — no vector embeddings required.',
    badges: [
      { label: 'NetworkX', tone: 'teal' as const },
      { label: 'Leiden', tone: 'teal' as const },
      { label: 'graspologic', tone: 'teal' as const },
      { label: 'community detection', tone: 'neutral' as const },
    ],
    detail: (
      <div className="space-y-3">
        <p>
          <strong className="font-semibold text-[var(--foreground)]">
            NetworkX
          </strong>{' '}
          is used as the in-memory graph representation during the build phase.
          Nodes carry metadata (file path, symbol kind, language, docstring
          embedding) and edges carry a confidence tier and relationship type.
        </p>
        <p>
          <strong className="font-semibold text-[var(--foreground)]">
            Leiden community detection
          </strong>{' '}
          (via{' '}
          <strong className="font-semibold text-[var(--foreground)]">
            graspologic
          </strong>
          ) partitions the graph into semantically cohesive clusters without
          needing pre-trained embeddings. Leiden improves on Louvain by
          guaranteeing well-connected communities and avoiding poorly connected
          subsets — critical for large monorepos where modularity is uneven.
        </p>
        <ul className="mt-2 space-y-1 pl-4">
          <li className="list-disc">
            Resolution parameter controls community granularity (default: 1.0)
          </li>
          <li className="list-disc">
            Community labels are stored as node attributes and surfaced in the
            graph UI
          </li>
          <li className="list-disc">
            Final graph is serialised to GraphML + JSON for persistence and
            export
          </li>
        </ul>
      </div>
    ),
  },
  {
    icon: <GraphIcon className="h-5 w-5" />,
    title: 'God Nodes & Surprises',
    description:
      'Identifies the highest-degree "god nodes" at the heart of the system and flags unexpected cross-file or cross-domain connections worth investigating.',
    badges: [
      { label: 'degree centrality', tone: 'rose' as const },
      { label: 'betweenness', tone: 'rose' as const },
      { label: 'cross-community edges', tone: 'neutral' as const },
    ],
    detail: (
      <div className="space-y-3">
        <p>
          God nodes are symbols (functions, classes, modules) whose in-degree or
          out-degree exceeds a configurable threshold relative to the graph
          median. They typically represent shared utilities, base classes, or
          framework entry points that many callers depend on — knowing them
          upfront lets agents scope their reasoning correctly.
        </p>
        <p>
          Surprise edges are inter-community edges whose source and target sit
          in different Leiden clusters. A high surprise-edge count between two
          clusters signals hidden coupling that the project structure
          doesn&apos;t make explicit — a valuable signal for refactoring or risk
          assessment.
        </p>
        <ul className="mt-2 space-y-1 pl-4">
          <li className="list-disc">
            Betweenness centrality highlights bridge nodes, not just highly
            connected ones
          </li>
          <li className="list-disc">
            Surprise edges are ranked by confidence tier and shown in the UI
            with a distinct colour
          </li>
        </ul>
      </div>
    ),
  },
  {
    icon: <BoxIcon className="h-5 w-5" />,
    title: 'Interactive Outputs',
    description:
      'Exports an interactive graph.html, a queryable graph.json, and a human-readable GRAPH_REPORT.md audit report.',
    badges: [
      { label: 'graph.html', tone: 'neutral' as const },
      { label: 'graph.json', tone: 'neutral' as const },
      { label: 'GRAPH_REPORT.md', tone: 'neutral' as const },
      { label: 'GraphML', tone: 'neutral' as const },
    ],
    detail: (
      <div className="space-y-3">
        <p>
          <strong className="font-semibold text-[var(--foreground)]">
            graph.html
          </strong>{' '}
          is a self-contained force-directed visualisation rendered with
          D3/Sigma — open it in any browser, no server required. Nodes are
          coloured by community and sized by degree.
        </p>
        <p>
          <strong className="font-semibold text-[var(--foreground)]">
            graph.json
          </strong>{' '}
          follows the{' '}
          <code className="rounded bg-[var(--surface)] px-1 py-0.5 font-mono text-xs">
            node-link
          </code>{' '}
          schema used by NetworkX, making it directly importable back into
          Python or queryable via the budget-aware search API.
        </p>
        <p>
          <strong className="font-semibold text-[var(--foreground)]">
            GRAPH_REPORT.md
          </strong>{' '}
          summarises god nodes, top communities, surprise edges, and file
          coverage stats in a format designed to paste directly into a PR
          description or agent prompt.
        </p>
      </div>
    ),
  },
  {
    icon: <ZapIcon className="h-5 w-5" />,
    title: 'gph CLI — 12-Command Graph Tool',
    description:
      'A purpose-built CLI for humans and AI agents: semantic search with token budgets, shortest-path traversal, AI explain, live watch mode, incremental index, and structured JSON export.',
    badges: [
      { label: 'gph search', tone: 'indigo' as const },
      { label: 'gph path', tone: 'indigo' as const },
      { label: 'gph explain', tone: 'indigo' as const },
      { label: '--budget', tone: 'teal' as const },
      { label: '--agent', tone: 'teal' as const },
      { label: 'Redis cache', tone: 'neutral' as const },
    ],
    detail: (
      <div className="space-y-4">
        <p>
          <strong className="font-semibold text-[var(--foreground)]">
            gph
          </strong>{' '}
          is the trchat command-line tool. Every command authenticates via a
          short-lived JWT (auto-refreshed) and speaks directly to the graph API,
          returning a budget-trimmed, structured context slice ready to paste
          into an agent prompt.
        </p>

        <div className="space-y-2">
          {[
            {
              cmd: 'gph login --key sk-trchat-...',
              desc: 'Exchange an API key for JWT tokens — stored locally, auto-refreshed before expiry. One-time setup.',
            },
            {
              cmd: 'gph index ./src --repo my-api-id',
              desc: 'Incrementally index a local repo path. Only changed files are re-parsed; prior state is reused.',
            },
            {
              cmd: 'gph search "authentication middleware" --budget 1500',
              desc: 'Nearest-neighbour semantic search capped at 1 500 tokens. Lower-confidence nodes are dropped first.',
            },
            {
              cmd: 'gph path AuthService ResponseInterceptor --repo my-api-id',
              desc: 'Shortest path between two named symbols — surfaces the exact call chain in hop order.',
            },
            {
              cmd: 'gph explain JwtGuard --repo my-api-id',
              desc: 'AI explanation of a node: its community, inbound callers, outbound callees, and confidence tier of each edge.',
            },
            {
              cmd: 'gph query "what calls validateToken?" --mode dfs',
              desc: 'Natural-language query resolved via DFS from the best matching entry-point — returns the full reachable subgraph.',
            },
            {
              cmd: 'gph export --repo backend-api --out ./context.json',
              desc: 'Exports a full agent context payload as a structured JSON bundle ready to feed into an LLM session.',
            },
            {
              cmd: 'gph watch ./src --repo my-api-id --on-commit',
              desc: 'Installs git post-commit hooks — triggers an incremental re-index on every commit automatically.',
            },
          ].map(({ cmd, desc }) => (
            <div
              key={cmd}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"
            >
              <pre className="overflow-x-auto font-mono text-[0.72rem] leading-5 text-[var(--foreground)]">
                {cmd}
              </pre>
              <p className="mt-1.5 text-xs leading-5 text-[var(--muted-foreground)]">
                {desc}
              </p>
            </div>
          ))}
        </div>

        <p className="text-xs text-[var(--muted-foreground)]">
          Community content is cached in Redis keyed by graph version — repeated
          agent queries for the same module are served instantly with zero
          re-serialisation cost.
        </p>
      </div>
    ),
  },
  {
    icon: <CheckIcon className="h-5 w-5" />,
    title: 'API Key + JWT Auth for CLI',
    description:
      'Scoped API keys (sk-trchat-…) are minted in the dashboard and exchanged for short-lived JWT access + refresh tokens. The CLI auto-renews tokens invisibly — no repeated logins.',
    badges: [
      { label: 'sk-trchat-…', tone: 'indigo' as const },
      { label: 'JWT exchange', tone: 'teal' as const },
      { label: 'auto-refresh', tone: 'teal' as const },
      { label: 'scopes', tone: 'neutral' as const },
    ],
    detail: (
      <div className="space-y-3">
        <p>
          API keys are the bridge between the web dashboard and the CLI. A key
          is minted with a label and optional scope list (e.g.{' '}
          <code className="rounded bg-[var(--surface)] px-1 py-0.5 font-mono text-xs">
            search
          </code>
          ,{' '}
          <code className="rounded bg-[var(--surface)] px-1 py-0.5 font-mono text-xs">
            export
          </code>
          ). The plaintext (
          <code className="rounded bg-[var(--surface)] px-1 py-0.5 font-mono text-xs">
            sk-trchat-…
          </code>
          ) is shown once and never stored — only its bcrypt hash lives in the
          database.
        </p>
        <p>
          Running{' '}
          <code className="rounded bg-[var(--surface)] px-1 py-0.5 font-mono text-xs">
            gph login --key sk-trchat-…
          </code>{' '}
          calls{' '}
          <code className="rounded bg-[var(--surface)] px-1 py-0.5 font-mono text-xs">
            POST /api/auth/exchange
          </code>
          , which validates the key hash and returns a short-lived JWT access
          token plus a refresh token. Both are stored in{' '}
          <code className="rounded bg-[var(--surface)] px-1 py-0.5 font-mono text-xs">
            ~/.trchat/credentials.json
          </code>
          .
        </p>
        <ul className="mt-2 space-y-1 pl-4">
          <li className="list-disc">
            Access tokens are short-lived; the CLI calls{' '}
            <code className="font-mono text-xs">POST /api/auth/refresh</code>{' '}
            automatically before any request when expiry is imminent
          </li>
          <li className="list-disc">
            Concurrent refresh races are deduplicated server-side — only one new
            token pair is issued per refresh window
          </li>
          <li className="list-disc">
            <code className="font-mono text-xs">gph logout</code> revokes the
            refresh token on the server — subsequent refresh attempts return 401
          </li>
          <li className="list-disc">
            Keys can be revoked individually via{' '}
            <code className="font-mono text-xs">DELETE /api/auth/keys/:id</code>{' '}
            without affecting other active keys or sessions
          </li>
        </ul>
      </div>
    ),
  },
  {
    icon: <ActivityIcon className="h-5 w-5" />,
    title: 'Live Watch & Incremental Index',
    description:
      'gph watch keeps the graph in sync automatically: file-system watcher mode for continuous polling, or git hook mode that re-indexes only on commit — zero manual sync steps.',
    badges: [
      { label: 'gph watch', tone: 'indigo' as const },
      { label: '--on-commit', tone: 'indigo' as const },
      { label: 'post-commit hook', tone: 'teal' as const },
      { label: 'incremental', tone: 'neutral' as const },
    ],
    detail: (
      <div className="space-y-3">
        <p>
          <strong className="font-semibold text-[var(--foreground)]">
            Server-side watcher
          </strong>{' '}
          (default) — the API starts a file-system observer on the specified
          repository path. Any write triggers a targeted re-index of only the
          changed files; the rest of the graph is untouched.
        </p>
        <p>
          <strong className="font-semibold text-[var(--foreground)]">
            Git hook mode
          </strong>{' '}
          (
          <code className="rounded bg-[var(--surface)] px-1 py-0.5 font-mono text-xs">
            --on-commit
          </code>
          ) — installs{' '}
          <code className="rounded bg-[var(--surface)] px-1 py-0.5 font-mono text-xs">
            post-commit
          </code>{' '}
          and{' '}
          <code className="rounded bg-[var(--surface)] px-1 py-0.5 font-mono text-xs">
            post-checkout
          </code>{' '}
          hooks in the local repository. After every{' '}
          <code className="rounded bg-[var(--surface)] px-1 py-0.5 font-mono text-xs">
            git commit
          </code>{' '}
          or branch switch, the graph is re-synced automatically — no polling
          process is required.
        </p>
        <ul className="mt-2 space-y-1 pl-4">
          <li className="list-disc">
            Stop the server-side watcher with{' '}
            <code className="font-mono text-xs">
              gph watch &lt;path&gt; --repo &lt;id&gt; --stop
            </code>
          </li>
          <li className="list-disc">
            Incremental sync reuses all unchanged node embeddings — only files
            whose content hash changed are re-parsed and re-embedded
          </li>
          <li className="list-disc">
            Works alongside the web dashboard — syncs triggered by the CLI are
            reflected in real time in the graph UI
          </li>
        </ul>
      </div>
    ),
  },
  {
    icon: <ShieldIcon className="h-5 w-5" />,
    title: 'Secure by Design',
    description:
      'Strict input validation: only http/https URLs, size and timeout limits, path containment, HTML-escaped node labels — defending against SSRF, injection and XSS.',
    badges: [
      { label: 'SSRF protection', tone: 'rose' as const },
      { label: 'XSS escaping', tone: 'rose' as const },
      { label: 'path containment', tone: 'amber' as const },
      { label: 'rate limiting', tone: 'neutral' as const },
    ],
    detail: (
      <div className="space-y-3">
        <p>
          All user-supplied repository URLs are validated against an allowlist
          of schemes (
          <code className="rounded bg-[var(--surface)] px-1 py-0.5 font-mono text-xs">
            http
          </code>
          ,{' '}
          <code className="rounded bg-[var(--surface)] px-1 py-0.5 font-mono text-xs">
            https
          </code>
          ) and rejected if they resolve to RFC-1918 private ranges or localhost
          — eliminating SSRF vectors.
        </p>
        <p>
          Node labels in the exported graph.html are HTML-entity-escaped before
          insertion into the DOM. File paths are resolved relative to a
          sandboxed working directory and checked for directory traversal before
          any read or write operation.
        </p>
        <ul className="mt-2 space-y-1 pl-4">
          <li className="list-disc">
            Ingestion jobs have a configurable max file size (default: 2 MB) and
            total repo size limit
          </li>
          <li className="list-disc">
            Outbound HTTP requests (for cloning) use a 30 s timeout and follow a
            maximum of 3 redirects
          </li>
          <li className="list-disc">
            API routes are rate-limited per authenticated user via a Redis
            sliding-window counter
          </li>
        </ul>
      </div>
    ),
  },
  {
    icon: <LinkIcon className="h-5 w-5" />,
    title: 'Edge Confidence Tiers',
    description:
      'Every edge carries a confidence tier — extracted, inferred, or speculative — so agents know how much to trust a relationship before reasoning over it.',
    badges: [
      { label: 'extracted', tone: 'teal' as const },
      { label: 'inferred', tone: 'amber' as const },
      { label: 'speculative', tone: 'rose' as const },
    ],
    detail: (
      <div className="space-y-3">
        <p>
          Edges are classified into three confidence tiers during graph
          construction:
        </p>
        <div className="mt-2 space-y-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="font-semibold text-[var(--foreground)]">
              Extracted{' '}
              <span className="ml-1 font-mono text-[0.7rem] font-normal text-[var(--color-dusty-olive-600)]">
                confidence: 1.0
              </span>
            </p>
            <p className="mt-0.5 text-xs">
              Directly parsed from source — import statements, explicit function
              calls observed in the AST. High fidelity; safe to reason over
              without hedging.
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="font-semibold text-[var(--foreground)]">
              Inferred{' '}
              <span className="ml-1 font-mono text-[0.7rem] font-normal text-[var(--color-rosy-taupe-700)]">
                confidence: 0.6 – 0.9
              </span>
            </p>
            <p className="mt-0.5 text-xs">
              Derived by the LLM from prose context, naming conventions, or
              co-occurrence patterns. Likely correct but should be verified
              before acting on.
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="font-semibold text-[var(--foreground)]">
              Speculative{' '}
              <span className="ml-1 font-mono text-[0.7rem] font-normal text-[var(--color-berry-crush-600)]">
                confidence: &lt; 0.6
              </span>
            </p>
            <p className="mt-0.5 text-xs">
              Weak signal — possible relationship surfaced by embedding
              similarity or heuristics. Useful for discovery; not reliable for
              automated decisions. Budget-trimming drops these first.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: <DatabaseIcon className="h-5 w-5" />,
    title: 'Community Cache (Redis)',
    description:
      'Graph communities and their serialised context bundles are cached in Redis, keyed by graph version — ensuring fast repeated queries with zero stale-data risk.',
    badges: [
      { label: 'Redis', tone: 'indigo' as const },
      { label: 'sliding TTL', tone: 'neutral' as const },
      { label: 'version-keyed', tone: 'neutral' as const },
    ],
    detail: (
      <div className="space-y-3">
        <p>
          When an agent or user queries a community (by ID or semantic search),
          the response is serialised once and stored in Redis under a key that
          includes the graph version hash:
        </p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-[var(--surface)] p-3 font-mono text-xs leading-5 text-[var(--foreground)]">
          {`community:<repo_id>:<graph_version>:<community_id>`}
        </pre>
        <p>
          After a re-sync, the graph version hash changes, so old cache entries
          are never served — they expire naturally via a 24 h TTL. This avoids
          the need for explicit cache invalidation on every write.
        </p>
        <ul className="mt-2 space-y-1 pl-4">
          <li className="list-disc">
            Cache hit rate is exposed in the{' '}
            <code className="font-mono text-xs">/api/health</code> endpoint for
            observability
          </li>
          <li className="list-disc">
            Budget trimming happens before caching so cached entries are already
            token-bounded
          </li>
          <li className="list-disc">
            Redis is optional — the API falls back to on-demand serialisation if
            no Redis URL is configured
          </li>
        </ul>
      </div>
    ),
  },
] as const;

export default function CapabilitiesPage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              'radial-gradient(50rem 28rem at 50% -8%, color-mix(in oklab, var(--color-space-indigo-400) 28%, transparent), transparent 60%)',
          }}
        />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <Badge>Capabilities</Badge>
          <h1 className="mt-4 font-display text-4xl font-medium leading-tight tracking-tight text-balance text-[var(--foreground)] sm:text-5xl">
            Core Capabilities
          </h1>
          <p className="mt-5 text-base leading-7 text-[var(--muted-foreground)] sm:text-lg">
            trchat unifies static analysis, semantic extraction and graph
            clustering into a single skill that any AI coding assistant can
            invoke. Click <em>Read more</em> on any card to see the underlying
            algorithms and design decisions.
          </p>
        </div>
      </section>

      {/* Cards grid */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((cap) => (
            <CapabilityCard
              key={cap.title}
              icon={cap.icon}
              title={cap.title}
              description={cap.description}
              badges={[...cap.badges]}
              detail={cap.detail}
            />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="gradient-cta overflow-hidden rounded-[var(--radius-card)] p-10 text-center text-white sm:p-16">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-medium tracking-tight text-balance sm:text-4xl">
            Ready to give your agents structured context?
          </h2>
          <div className="mt-8 flex justify-center">
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-white transition hover:border-white/40 hover:bg-white/20"
            >
              Get started
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
