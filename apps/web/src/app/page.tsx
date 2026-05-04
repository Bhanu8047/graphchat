import Link from 'next/link';
import { Badge } from '../components/atoms/Badge';
import { buttonStyles } from '../components/atoms/buttonStyles';
import { Surface } from '../components/atoms/Surface';
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
    title: 'Knowledge graph viz',
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
    icon: <ArrowRightIcon className="h-5 w-5" />,
    title: 'Connect a repository',
    description:
      'Sign in with GitHub, pick a branch, and trigger ingestion in a single click.',
  },
  {
    icon: <GraphIcon className="h-5 w-5" />,
    title: 'Build the graph',
    description:
      'Incremental sync reuses prior state and only rebuilds what actually changed.',
  },
  {
    icon: <SparkleIcon className="h-5 w-5" />,
    title: 'Query and export',
    description:
      'Search semantically, browse the graph, and export bundles for your agents.',
  },
] as const;

export default function MarketingHomePage() {
  return (
    <MarketingShell>
      {/* HERO ------------------------------------------------------------- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(60rem 40rem at 70% -10%, color-mix(in oklab, var(--color-rosy-taupe-300) 50%, transparent), transparent 60%), radial-gradient(50rem 30rem at -10% 20%, color-mix(in oklab, var(--color-space-indigo-300) 45%, transparent), transparent 60%)',
          }}
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-28">
          <div>
            <Badge tone="primary">Repository graphs · v1</Badge>
            <h1 className="mt-5 font-display text-4xl font-medium leading-[1.05] tracking-tight text-balance text-[var(--foreground)] sm:text-5xl lg:text-6xl">
              Persistent repository graphs{' '}
              <span className="gradient-text-hero">
                for humans and AI agents
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted-foreground)] sm:text-lg">
              Stop pasting whole repos into prompts. Build a graph once, sync it
              incrementally, and let agents query just the slice they need.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/auth/sign-up"
                className={buttonStyles({ tone: 'primary', size: 'lg' })}
              >
                Get started
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                href="#how-it-works"
                className={buttonStyles({ tone: 'secondary', size: 'lg' })}
              >
                See how it works
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              No credit card · GitHub sign-in
            </div>
          </div>

          {/* Hero visual placeholder — TODO: replace with product screenshot */}
          <div className="relative">
            <Surface
              tone="hero"
              padding="lg"
              className="aspect-[4/3] overflow-hidden"
            >
              <div className="flex h-full flex-col justify-between text-white">
                <div>
                  <Badge
                    tone="neutral"
                    className="border-white/20 bg-white/10 text-white"
                  >
                    Live preview
                  </Badge>
                  <div className="mt-4 font-display text-2xl leading-tight">
                    main · 2,418 nodes
                  </div>
                  <div className="mt-1 text-sm text-white/80">
                    Synced 2 minutes ago
                  </div>
                </div>
                {/* Decorative graph SVG (placeholder for product imagery) */}
                <svg viewBox="0 0 320 200" className="mt-4 w-full" aria-hidden>
                  <defs>
                    <linearGradient id="edge" x1="0" x2="1" y1="0" y2="1">
                      <stop offset="0" stopColor="rgba(255,255,255,0.65)" />
                      <stop offset="1" stopColor="rgba(255,255,255,0.15)" />
                    </linearGradient>
                  </defs>
                  {[
                    [40, 40, 140, 90],
                    [140, 90, 80, 160],
                    [140, 90, 220, 50],
                    [220, 50, 280, 120],
                    [220, 50, 180, 170],
                    [80, 160, 180, 170],
                  ].map(([x1, y1, x2, y2], i) => (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="url(#edge)"
                      strokeWidth="1.4"
                    />
                  ))}
                  {[
                    [40, 40, 8],
                    [140, 90, 12],
                    [80, 160, 7],
                    [220, 50, 10],
                    [280, 120, 6],
                    [180, 170, 9],
                  ].map(([cx, cy, r], i) => (
                    <circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill="rgba(255,255,255,0.85)"
                    />
                  ))}
                </svg>
              </div>
            </Surface>
          </div>
        </div>
      </section>

      {/* FEATURES --------------------------------------------------------- */}
      <section
        id="features"
        className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
      >
        <div className="max-w-2xl">
          <Badge>Features</Badge>
          <h2 className="mt-4 font-display text-3xl font-medium tracking-tight text-balance text-[var(--foreground)] sm:text-4xl">
            Everything you need to ship a graph-aware agent
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--muted-foreground)]">
            A small surface area that does the boring work — ingestion, sync,
            query, export — so your agents focus on what matters.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      {/* HOW IT WORKS ----------------------------------------------------- */}
      <section
        id="how-it-works"
        className="border-y border-[var(--border)] bg-[var(--surface-muted)]"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="max-w-2xl">
            <Badge tone="accent">How it works</Badge>
            <h2 className="mt-4 font-display text-3xl font-medium tracking-tight text-balance text-[var(--foreground)] sm:text-4xl">
              Three steps from repository to ready-to-query graph
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <StepTile
                key={step.title}
                index={index + 1}
                title={step.title}
                description={step.description}
                icon={step.icon}
              />
            ))}
          </div>
        </div>
      </section>

      {/* VISUALIZATION SHOWCASE ------------------------------------------- */}
      <section
        id="showcase"
        className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
      >
        <div
          className={cn(
            'gradient-olive overflow-hidden rounded-[var(--radius-card)] p-8 text-white sm:p-12 lg:p-16',
          )}
        >
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
                matter to the question you're asking.
              </p>
            </div>
            <svg viewBox="0 0 480 280" className="w-full" aria-hidden>
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
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="rgba(255,255,255,0.92)"
                />
              ))}
            </svg>
          </div>
        </div>
      </section>

      {/* CTA -------------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
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
