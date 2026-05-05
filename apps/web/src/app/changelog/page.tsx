import Link from 'next/link';
import { Badge } from '../../components/atoms/Badge';
import { buttonStyles } from '../../components/atoms/buttonStyles';
import { ArrowRightIcon } from '../../components/atoms/Icon';
import { MarketingShell } from '../../components/templates/MarketingShell';
import { cn } from '../../lib/ui';

export const metadata = {
  title: 'Changelog — graphchat',
  description:
    'What is new in graphchat — feature releases, improvements, and fixes.',
};

type ChangeType = 'feature' | 'improvement' | 'fix' | 'security';

interface Change {
  type: ChangeType;
  text: string;
}

interface Release {
  version: string;
  date: string;
  label?: string;
  summary: string;
  changes: Change[];
}

const releases: Release[] = [
  {
    version: '1.3.0',
    date: '2026-05-05',
    label: 'Latest',
    summary:
      'Full CLI tool (gph) shipped with 12 commands, API-key + JWT exchange authentication, and a complete REST API surface for programmatic access.',
    changes: [
      {
        type: 'feature',
        text: 'New gph CLI — 12 commands: login, logout, status, repos, index, search, query, path, explain, report, export, watch.',
      },
      {
        type: 'feature',
        text: 'API key management: mint, list, and revoke named scoped keys from the dashboard or via POST /api/auth/keys.',
      },
      {
        type: 'feature',
        text: 'JWT exchange endpoint (POST /api/auth/exchange) — trades an API key for short-lived access + refresh tokens, enabling fully non-interactive CLI authentication.',
      },
      {
        type: 'feature',
        text: 'Auto token refresh — the CLI silently refreshes the access token before expiry using POST /api/auth/refresh without requiring re-login.',
      },
      {
        type: 'feature',
        text: 'gph search --agent flag emits a compact Markdown context block ready to paste directly into an AI chat prompt.',
      },
      {
        type: 'feature',
        text: 'gph watch --on-commit installs git post-commit/post-checkout hooks for automatic re-index on every commit.',
      },
      {
        type: 'feature',
        text: 'gph path <source> <target> finds the shortest graph path between any two named symbols and prints every hop.',
      },
      {
        type: 'feature',
        text: 'gph explain <label> produces an AI-generated explanation of a node including its community, callers, callees, and confidence tiers.',
      },
      {
        type: 'improvement',
        text: 'Graph report (gph report) now includes surprise edge rankings and file coverage percentage per community.',
      },
      {
        type: 'improvement',
        text: 'POST /api/auth/logout now accepts the refresh token in the body and revokes it server-side for clean CLI logout.',
      },
      {
        type: 'security',
        text: 'API key hashing: only the key hash is stored in the database; the plaintext is returned once at creation and never logged.',
      },
      {
        type: 'security',
        text: 'Refresh token deduplication: concurrent auto-refresh races are resolved server-side to prevent duplicate token issuance.',
      },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-04-18',
    summary:
      'Graph analysis and community detection improvements, Redis community cache, and the interactive graph visualisation.',
    changes: [
      {
        type: 'feature',
        text: 'Leiden community detection via graspologic — partitions graphs into well-connected clusters without pre-trained embeddings.',
      },
      {
        type: 'feature',
        text: 'Redis community cache: bundles are serialised once per graph version and served instantly on repeated queries (zero stale-data risk via version-keyed TTL).',
      },
      {
        type: 'feature',
        text: 'GET /api/graph/community/:id/prompt returns a token-bounded, agent-ready context bundle for a single community.',
      },
      {
        type: 'feature',
        text: 'God-node detection: flags the highest-degree symbols by degree centrality and betweenness — surfaced in the graph UI and reports.',
      },
      {
        type: 'feature',
        text: 'Surprise edge highlighting: inter-community edges are ranked and shown with a distinct colour in the interactive graph.',
      },
      {
        type: 'improvement',
        text: 'Graph sync is now incremental — only files changed since the last sync are re-parsed and re-embedded.',
      },
      {
        type: 'improvement',
        text: 'Cache hit rate is exposed in GET /api/health for observability.',
      },
      {
        type: 'fix',
        text: 'Fixed a race condition in concurrent graph sync jobs that could produce duplicate nodes for the same file.',
      },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-04-01',
    summary:
      'Multi-modal extraction support and edge confidence tiers added to the graph build pipeline.',
    changes: [
      {
        type: 'feature',
        text: 'Tree-sitter AST parsing for Python, JavaScript/TypeScript, Go, Java, Rust, Ruby, C/C++, Kotlin, and Swift.',
      },
      {
        type: 'feature',
        text: 'LLM-pass extraction for prose files (Markdown, RST, PDF text) — identifies concepts, entities, and inter-document references.',
      },
      {
        type: 'feature',
        text: 'Vision model pass for image assets — diagram descriptions are chunked and vectorised alongside code.',
      },
      {
        type: 'feature',
        text: 'Edge confidence tiers: EXTRACTED (1.0), INFERRED (0.6–0.9), SPECULATIVE (<0.6) — stored as edge attributes, surfaced in search and reports.',
      },
      {
        type: 'feature',
        text: 'Budget trimming: speculative edges are dropped first when results exceed the requested token budget.',
      },
      {
        type: 'improvement',
        text: 'Chunk size and overlap are now configurable per file type via the admin settings panel.',
      },
      {
        type: 'fix',
        text: 'Fixed incorrect line-number offsets in Python function extraction when files used Windows line endings.',
      },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-03-15',
    summary:
      'Initial release: GitHub repository ingestion, vector search, knowledge graph build, multi-format export, and the web dashboard.',
    changes: [
      {
        type: 'feature',
        text: 'GitHub repository ingestion — connect a repo, pick a branch, trigger ingestion in one click.',
      },
      {
        type: 'feature',
        text: 'Vector search endpoint with nearest-neighbour retrieval (POST /api/nodes/search).',
      },
      {
        type: 'feature',
        text: 'Interactive knowledge graph view with pan, zoom, and edge traversal.',
      },
      {
        type: 'feature',
        text: 'Multi-format export: graph.html, graph.json (node-link schema), GRAPH_REPORT.md, and GraphML.',
      },
      {
        type: 'feature',
        text: 'Email + password and GitHub OAuth authentication.',
      },
      {
        type: 'feature',
        text: 'Admin panel with user management, role assignment, and rate-limit configuration.',
      },
      {
        type: 'feature',
        text: 'Usage dashboard showing ingestion jobs, search counts, and export history.',
      },
      {
        type: 'security',
        text: 'SSRF protection on all repository URLs — rejects private RFC-1918 ranges and localhost.',
      },
      {
        type: 'security',
        text: 'Rate limiting per authenticated user via Redis sliding-window counter.',
      },
    ],
  },
];

const typeConfig: Record<
  ChangeType,
  { label: string; tone: 'primary' | 'success' | 'accent' | 'rose' }
> = {
  feature: { label: 'Feature', tone: 'primary' },
  improvement: { label: 'Improvement', tone: 'success' },
  fix: { label: 'Fix', tone: 'accent' },
  security: { label: 'Security', tone: 'rose' },
};

export default function ChangelogPage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              'radial-gradient(48rem 26rem at 50% -5%, color-mix(in oklab, var(--color-space-indigo-400) 25%, transparent), transparent 60%)',
          }}
        />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <Badge>Changelog</Badge>
          <h1 className="mt-4 font-display text-4xl font-medium leading-tight tracking-tight text-balance text-[var(--foreground)] sm:text-5xl">
            What&apos;s new in graphchat
          </h1>
          <p className="mt-5 text-base leading-7 text-[var(--muted-foreground)] sm:text-lg">
            A running log of features, improvements, and fixes — newest first.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/docs"
              className={buttonStyles({ tone: 'primary', size: 'lg' })}
            >
              Read the docs
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link
              href="/capabilities"
              className={buttonStyles({ tone: 'secondary', size: 'lg' })}
            >
              View capabilities
            </Link>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="space-y-14">
          {releases.map((release, releaseIdx) => (
            <article
              key={release.version}
              className="grid gap-6 sm:grid-cols-[180px_1fr]"
            >
              {/* Version / date sidebar */}
              <div className="sm:text-right">
                <div className="flex items-center gap-2 sm:justify-end">
                  <span className="font-display text-xl font-semibold text-[var(--foreground)]">
                    v{release.version}
                  </span>
                  {release.label ? (
                    <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--primary-foreground)]">
                      {release.label}
                    </span>
                  ) : null}
                </div>
                <time
                  dateTime={release.date}
                  className="mt-1 block text-sm text-[var(--muted-foreground)]"
                >
                  {new Date(release.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              </div>

              {/* Release content */}
              <div
                className={cn(
                  'relative',
                  releaseIdx < releases.length - 1 && 'pb-14',
                )}
              >
                {/* Connector line */}
                {releaseIdx < releases.length - 1 ? (
                  <span
                    aria-hidden
                    className="absolute -bottom-14 left-[-1.125rem] top-3 w-px bg-[var(--border)] sm:left-[-2.5rem]"
                  />
                ) : null}

                <p className="text-base leading-7 text-[var(--muted-foreground)]">
                  {release.summary}
                </p>

                <ul className="mt-5 space-y-3">
                  {release.changes.map((change, i) => {
                    const cfg = typeConfig[change.type];
                    return (
                      <li key={i} className="flex items-start gap-3">
                        <Badge
                          tone={cfg.tone}
                          className="mt-0.5 shrink-0 text-[0.65rem]"
                        >
                          {cfg.label}
                        </Badge>
                        <span className="text-sm leading-6 text-[var(--muted-foreground)]">
                          {change.text}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="gradient-cta overflow-hidden rounded-[var(--radius-card)] p-10 text-center text-white sm:p-16">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-medium tracking-tight text-balance sm:text-4xl">
            Try the latest release today.
          </h2>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/auth/sign-up"
              className={cn(
                buttonStyles({ tone: 'secondary', size: 'lg' }),
                'border-white/20 bg-white/10 text-white hover:border-white/40 hover:bg-white/20',
              )}
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
