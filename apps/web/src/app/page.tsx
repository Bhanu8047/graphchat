import Link from 'next/link';
import { Fragment } from 'react';
import { Badge } from '../components/atoms/Badge';
import { buttonStyles } from '../components/atoms/buttonStyles';
import {
  ArrowRightIcon,
  CheckIcon,
  GraphIcon,
  SearchIcon,
  SparkleIcon,
} from '../components/atoms/Icon';
import { FeatureCard } from '../components/molecules/FeatureCard';
import { StepTile } from '../components/molecules/StepTile';
import { MarketingShell } from '../components/templates/MarketingShell';
import { cn } from '../lib/ui';

export const metadata = {
  title: 'trchat — Persistent repository graphs for AI agents',
  description:
    'Build, store, and query branch-specific repository graphs. Give AI agents structured context instead of raw repository dumps.',
};

const features = [
  {
    icon: <GraphIcon className="h-5 w-5" />,
    title: 'Repository ingestion',
    description:
      'Connect GitHub repositories and produce a graph for any branch, no extra tooling required.',
  },
  {
    icon: <SearchIcon className="h-5 w-5" />,
    title: 'Vector search',
    description:
      'Chunk source files into semantic units indexed for fast nearest-neighbour retrieval.',
  },
  {
    icon: <GraphIcon className="h-5 w-5" />,
    title: 'Knowledge graph',
    description:
      'Inspect call sites, imports, and structural edges in an interactive graph view.',
  },
  {
    icon: <SparkleIcon className="h-5 w-5" />,
    title: 'AI-assisted exploration',
    description:
      'Ask questions in natural language and get answers grounded in graph context.',
  },
  {
    icon: <ArrowRightIcon className="h-5 w-5" />,
    title: 'Multi-format export',
    description:
      'Export the graph as JSON, GraphML, or context bundles ready to feed into agents.',
  },
  {
    icon: <CheckIcon className="h-5 w-5" />,
    title: 'Token-minimized API',
    description:
      'Authenticated endpoints return just the graph slice you ask for — no token waste.',
  },
] as const;

const steps = [
  {
    icon: <SearchIcon className="h-5 w-5" />,
    title: 'Connect a repository',
    description:
      'Sign in with GitHub, pick a branch, and trigger ingestion in a single click.',
    tone: 'indigo',
  },
  {
    icon: <GraphIcon className="h-5 w-5" />,
    title: 'Build the graph',
    description:
      'Incremental sync reuses prior state and only rebuilds what actually changed.',
    tone: 'teal',
  },
  {
    icon: <SparkleIcon className="h-5 w-5" />,
    title: 'Query and export',
    description:
      'Search semantically, browse the graph, and export bundles for your agents.',
    tone: 'rose',
  },
] as const;

function GraphVisual({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 280"
      className={cn('h-auto w-full', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="show-edge" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="rgba(255,255,255,0.7)" />
          <stop offset="1" stopColor="rgba(255,255,255,0.15)" />
        </linearGradient>
      </defs>
      {[
        [60, 60, 200, 110],
        [200, 110, 120, 220],
        [200, 110, 320, 70],
        [320, 70, 420, 150],
        [320, 70, 280, 230],
        [120, 220, 280, 230],
        [200, 110, 60, 60],
        [420, 150, 280, 230],
      ].map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="url(#show-edge)"
          strokeWidth="1.4"
        />
      ))}
      {[
        [60, 60, 10],
        [200, 110, 16],
        [120, 220, 9],
        [320, 70, 13],
        [420, 150, 8],
        [280, 230, 11],
      ].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.92)" />
      ))}
    </svg>
  );
}

export default function MarketingHomePage() {
  return (
    <MarketingShell>
      {/* HERO — centered, minimal, Adonis-style ----------------------------- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              'radial-gradient(60rem 36rem at 50% -10%, color-mix(in oklab, var(--color-space-indigo-400) 35%, transparent), transparent 65%)',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-10 h-[80vh] opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--foreground) 1px, transparent 1px), linear-gradient(to bottom, var(--foreground) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage:
              'radial-gradient(ellipse at 50% 0%, black 30%, transparent 70%)',
          }}
        />
        <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32 lg:py-40">
          <Link
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--surface)_70%,transparent)] px-4 py-1.5 text-xs text-[var(--muted-foreground)] backdrop-blur transition hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
          >
            <span className="font-semibold text-[var(--success)]">New</span>
            <span className="h-3 w-px bg-[var(--border)]" />
            <span>Persistent graphs for AI agents · See how it works</span>
            <ArrowRightIcon className="h-3 w-3" />
          </Link>
          <h1 className="mt-8 font-display text-4xl font-medium leading-[1.05] tracking-tight text-balance text-[var(--foreground)] sm:text-5xl lg:text-6xl">
            Persistent repository graphs for humans and AI agents
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--muted-foreground)] sm:text-lg">
            Stop pasting whole repos into prompts. Build a graph once, sync it
            incrementally, and let agents query just the slice they need —
            structured context instead of raw token dumps.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/auth/sign-up"
              className={buttonStyles({ tone: 'primary', size: 'lg' })}
            >
              Get started
            </Link>
            <Link
              href="#how-it-works"
              className={buttonStyles({ tone: 'secondary', size: 'lg' })}
            >
              Our philosophy
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES --------------------------------------------------------- */}
      <section
        id="features"
        className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
      >
        <div className="mx-auto max-w-2xl text-center">
          <Badge>Features</Badge>
          <h2 className="mt-4 font-display text-3xl font-medium tracking-tight text-balance text-[var(--foreground)] sm:text-4xl">
            Everything you need to ship a graph-aware agent
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--muted-foreground)]">
            A small surface area that does the boring work — ingestion, sync,
            query, export — so your agents focus on what matters.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      {/* HOW IT WORKS ----------------------------------------------------- */}
      <section
        id="how-it-works"
        className="border-y border-[var(--border)] bg-[var(--background)]"
      >
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
              How it works?
            </h2>
          </div>

          {/* Steps row with dashed connectors */}
          <div className="mt-16 flex flex-col items-center gap-12 md:flex-row md:items-start md:gap-0">
            {steps.map((step, index) => (
              <Fragment key={step.title}>
                {/* Step — equal flex-1 width */}
                <div className="flex flex-1 flex-col items-center">
                  <StepTile
                    title={step.title}
                    description={step.description}
                    icon={step.icon}
                    tone={step.tone}
                  />
                </div>

                {/* Dashed connector — only between steps, not after last */}
                {index < steps.length - 1 ? (
                  <div
                    aria-hidden
                    className="mx-2 hidden shrink-0 items-center gap-2 md:flex"
                    style={{ marginTop: '37px' }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--border)]" />
                    <svg width="80" height="2" aria-hidden>
                      <line
                        x1="0"
                        y1="1"
                        x2="80"
                        y2="1"
                        stroke="var(--border)"
                        strokeWidth="2"
                        strokeDasharray="5 5"
                      />
                    </svg>
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--border)]" />
                  </div>
                ) : null}
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* VISUALIZATION SHOWCASE — graph lives here ------------------------ */}
      <section
        id="showcase"
        className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
      >
        <div className="gradient-olive overflow-hidden rounded-[var(--radius-card)] p-8 text-white sm:p-12 lg:p-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr]">
            <div>
              <Badge
                tone="neutral"
                className="border-white/20 bg-white/10 text-white"
              >
                Visualization
              </Badge>
              <h2 className="mt-4 font-display text-3xl font-medium tracking-tight text-balance sm:text-4xl">
                See your repository the way an agent does
              </h2>
              <p className="mt-4 text-base leading-7 text-white/85">
                A calm, navigable graph view of files, modules, and call sites.
                Pan, zoom, and follow edges into the parts of the codebase that
                matter to the question you&apos;re asking.
              </p>
            </div>
            <div className="relative">
              <div
                aria-hidden
                className="absolute inset-0 -z-10 rounded-2xl bg-white/5 blur-2xl"
              />
              <GraphVisual />
            </div>
          </div>
        </div>
      </section>

      {/* WHAT'S NEW ------------------------------------------------------- */}
      <section
        id="whats-new"
        className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge>What&apos;s new</Badge>
            <h2 className="mt-4 font-display text-3xl font-medium tracking-tight text-[var(--foreground)] sm:text-4xl">
              Latest updates
            </h2>
          </div>
          <Link
            href="/changelog"
            className={cn(
              buttonStyles({ tone: 'ghost', size: 'sm' }),
              'shrink-0',
            )}
          >
            Full changelog
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              version: 'v1.3.0',
              tag: 'Feature',
              tagTone: 'primary' as const,
              title: 'gph CLI — 12-command graph tool',
              description:
                'Login, index, search, query, path, explain, report, export, and watch — all speaking directly to the graph API with token-budget output for AI agents.',
            },
            {
              version: 'v1.3.0',
              tag: 'Feature',
              tagTone: 'primary' as const,
              title: 'API key + JWT auth',
              description:
                'Mint scoped API keys in the dashboard, exchange them for auto-refreshing JWT tokens, and authenticate the CLI with a single gph login command.',
            },
            {
              version: 'v1.2.0',
              tag: 'Improvement',
              tagTone: 'success' as const,
              title: 'Leiden community detection',
              description:
                'Graph communities are now detected via Leiden (graspologic), cached in Redis per graph version, and surfaced as agent-ready context bundles.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge tone={item.tagTone}>{item.tag}</Badge>
                <span className="font-mono text-xs text-[var(--muted-foreground)]">
                  {item.version}
                </span>
              </div>
              <h3 className="font-semibold text-[var(--foreground)]">
                {item.title}
              </h3>
              <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA -------------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="gradient-cta overflow-hidden rounded-[var(--radius-card)] p-10 text-center text-white sm:p-16">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-medium tracking-tight text-balance sm:text-4xl">
            Give your agents persistent context. Start in under a minute.
          </h2>
          <div className="mt-8 flex justify-center">
            <Link
              href="/auth/sign-up"
              className={cn(
                buttonStyles({ tone: 'secondary', size: 'lg' }),
                'border-white/20 bg-white/10 text-white hover:border-white/40 hover:bg-white/20',
              )}
            >
              Create your account
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
